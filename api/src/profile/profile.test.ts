import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Hono } from "hono";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { closeDb, getDb } from "../db.ts";
import type { EditionSettings, Profile } from "../types.ts";
import { profileRouter, resetProfileDb } from "./index.ts";

const PROFILE_KEYS = ["user", "publishingSince", "settings", "stats", "sectionCounts", "archive"];
const SETTINGS_KEYS = ["editionName", "showEditionTag", "interviewReminderAt"];
const STATS_KEYS = ["storiesPublished", "flashes", "facts", "draftsInProgress"];

const SECTION_COUNTS = [
  { label: "עבודה", detail: "61 ידיעות · מדור ראשי" },
  { label: "משפחה", detail: "44 ידיעות" },
  { label: "חברים", detail: "31 ידיעות" },
  { label: "אוכל · רגעים · חגיגות", detail: "78 ידיעות" },
];

const ARCHIVE = ["אוג׳ 26", "יולי 26", "יוני 26", "מאי 26"];

const SESSION_ID = "sess-profile-test";

function makeApp(): Hono {
  const app = new Hono();
  app.route("/", profileRouter);
  return app;
}

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "iton-profile-"));
  return join(dir, "test.sqlite");
}

function seedProfile(dbPath: string): void {
  process.env.DATABASE_PATH = dbPath;
  resetProfileDb();
  const db = getDb();

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial, age, city, headline, publishing_since)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "u1",
    "עומר עפרון",
    "omer@example.com",
    "hash",
    "ע",
    29,
    "חיפה",
    "מפתח ומוביל צוות",
    "המהדורה שלו יוצאת מאז ינואר 2026",
  );

  db.prepare(
    `INSERT INTO edition_settings (user_id, edition_name, show_edition_tag, interview_reminder_at)
     VALUES (?, ?, ?, ?)`,
  ).run("u1", "המהדורה של עומר עפרון", 1, "21:00");

  db.prepare(
    `INSERT INTO profile_stats (user_id, stories_published, flashes, facts, drafts_in_progress)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("u1", 214, 38, 12, 1);

  db.prepare(
    `INSERT INTO profile_meta (user_id, section_counts_json, archive_json)
     VALUES (?, ?, ?)`,
  ).run("u1", JSON.stringify(SECTION_COUNTS), JSON.stringify(ARCHIVE));

  db.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).run(
    SESSION_ID,
    "u1",
    new Date(Date.now() + 86400000).toISOString(),
  );
}

function sessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=${SESSION_ID}`;
}

function assertProfileShape(profile: Profile): void {
  assert.deepEqual(Object.keys(profile).sort(), PROFILE_KEYS.sort());
  assert.deepEqual(Object.keys(profile.settings).sort(), SETTINGS_KEYS.sort());
  assert.deepEqual(Object.keys(profile.stats).sort(), STATS_KEYS.sort());
  assert.ok(profile.user.id);
  assert.ok(profile.user.name);
  assert.ok(profile.user.email);
  assert.ok(profile.user.initial);
}

test("GET /profile returns seed shape keys", async () => {
  const dbPath = tempDbPath();
  try {
    seedProfile(dbPath);
    const app = makeApp();
    const res = await app.request("/profile", {
      headers: { Cookie: sessionCookie() },
    });
    assert.equal(res.status, 200);
    const profile = (await res.json()) as Profile;
    assertProfileShape(profile);
    assert.equal(profile.settings.showEditionTag, true);
    assert.equal(profile.settings.editionName, "המהדורה של עומר עפרון");
    assert.equal(profile.stats.storiesPublished, 214);
    assert.equal(profile.sectionCounts.length, 4);
    assert.equal(profile.archive.length, 4);
  } finally {
    resetProfileDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test("PATCH showEditionTag round-trips via GET /profile", async () => {
  const dbPath = tempDbPath();
  try {
    seedProfile(dbPath);
    const app = makeApp();
    const headers = {
      Cookie: sessionCookie(),
      "Content-Type": "application/json",
    };

    const patchRes = await app.request("/profile/edition-settings", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ showEditionTag: false }),
    });
    assert.equal(patchRes.status, 200);
    const settings = (await patchRes.json()) as EditionSettings;
    assert.equal(settings.showEditionTag, false);

    const getRes = await app.request("/profile", { headers: { Cookie: sessionCookie() } });
    assert.equal(getRes.status, 200);
    const profile = (await getRes.json()) as Profile;
    assert.equal(profile.settings.showEditionTag, false);
  } finally {
    resetProfileDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test("GET /profile without session returns 401", async () => {
  const dbPath = tempDbPath();
  try {
    seedProfile(dbPath);
    const app = makeApp();
    const res = await app.request("/profile");
    assert.equal(res.status, 401);
  } finally {
    resetProfileDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test.after(() => {
  closeDb();
});
