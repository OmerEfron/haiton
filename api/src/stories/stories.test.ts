import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { closeDb, getDb } from "../db.ts";
import { createStoriesRouter } from "./router.ts";

const USER_ID = "u-test";
const SESSION_ID = "sess-test";
const COOKIE = `iton_session=${SESSION_ID}`;

let dbDir: string;
let app: ReturnType<typeof createStoriesRouter>;

function seedBaseUser(): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial)
     VALUES (?, 'בדיקה', 'test@example.com', 'x', 'ב')`,
  ).run(USER_ID);
  db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(SESSION_ID, USER_ID, "2099-01-01T00:00:00.000Z");
  db.prepare(
    "INSERT INTO edition_settings (user_id, edition_name) VALUES (?, ?)",
  ).run(USER_ID, "המהדורה של בדיקה");
  db.prepare(
    `INSERT INTO edition_state (user_id, edition_number, date_long, date_short, ticker_json, digests_json)
     VALUES (?, 5, 'יום ראשון', 'ראשון, 01.01.26', '[]', '[]')`,
  ).run(USER_ID);
  db.prepare(
    "INSERT INTO profile_stats (user_id, stories_published, flashes, drafts_in_progress) VALUES (?, 2, 1, 0)",
  ).run(USER_ID);
  db.prepare(
    "INSERT INTO profile_meta (user_id, section_counts_json, archive_json) VALUES (?, '[]', '[]')",
  ).run(USER_ID);
}

function insertStory(
  id: string,
  section: string,
  placement: string,
  headline: string,
): void {
  getDb()
    .prepare(
      `INSERT INTO stories (
        id, user_id, section, section_name, edition_label, headline, standfirst,
        body_json, angle, byline, published_at, placement, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, '', '[]', '', 'כתב', '01.01.26, 10:00', ?, '2020-01-01T00:00:00.000Z')`,
    )
    .run(id, USER_ID, section, "עבודה", "המהדורה של בדיקה", headline, placement);
}

before(() => {
  dbDir = mkdtempSync(join(tmpdir(), "iton-stories-"));
  process.env.DATABASE_PATH = join(dbDir, "test.sqlite");
  closeDb();
  seedBaseUser();
  app = createStoriesRouter();
});

after(() => {
  closeDb();
  rmSync(dbDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
});

test("GET /stories/:id returns 404 for missing story", async () => {
  const res = await app.request("/stories/999", { headers: { Cookie: COOKIE } });
  assert.equal(res.status, 404);
  const body = (await res.json()) as { message: string };
  assert.equal(body.message, "הידיעה לא נמצאה בארכיון");
});

test("GET /stories?section= filters by section", async () => {
  insertStory("10", "work", "list", "ידיעת עבודה");
  insertStory("11", "family", "list", "ידיעת משפחה");

  const res = await app.request("/stories?section=work", {
    headers: { Cookie: COOKIE },
  });
  assert.equal(res.status, 200);
  const stories = (await res.json()) as { id: string; section: string }[];
  assert.ok(stories.every((s) => s.section === "work"));
  assert.ok(stories.some((s) => s.id === "10"));
  assert.ok(!stories.some((s) => s.id === "11"));
});

test("GET /editions/current returns null openDraft when title column is null", async () => {
  getDb()
    .prepare("UPDATE profile_stats SET drafts_in_progress = 1 WHERE user_id = ?")
    .run(USER_ID);

  const res = await app.request("/editions/current", { headers: { Cookie: COOKIE } });
  assert.equal(res.status, 200);
  const page = (await res.json()) as { openDraft: unknown };
  assert.equal(page.openDraft, null);
});

test("POST /stories demotes lead and increments edition", async () => {
  closeDb();
  process.env.DATABASE_PATH = join(dbDir, "publish.sqlite");
  seedBaseUser();
  insertStory("100", "work", "lead", "כותרת ישנה");
  insertStory("101", "work", "secondary", "ידיעה משנית");
  app = createStoriesRouter();

  const draft = {
    id: "d1",
    status: "ready" as const,
    angle: "זווית | פרט",
    headline: "כותרת חדשה",
    standfirst: "כותרת משנה",
    paragraphs: ["חיפה. פסקה ראשונה.", "פסקה שנייה."],
    pendingParagraph: null,
    checks: [],
    section: null,
  };

  const res = await app.request("/stories", {
    method: "POST",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  assert.equal(res.status, 201);

  const story = (await res.json()) as {
    id: string;
    placement: string;
    ownEdition: boolean;
    sectionName: string;
    shareToken: string;
    author: { id: string };
  };
  assert.equal(story.placement, "lead");
  assert.equal(story.ownEdition, true);
  assert.equal(story.sectionName, "ראשי");
  assert.ok(story.shareToken);
  assert.equal(story.author.id, USER_ID);

  const db = getDb();
  const oldLead = db
    .prepare("SELECT placement FROM stories WHERE user_id = ? AND id = '100'")
    .get(USER_ID) as { placement: string };
  assert.equal(oldLead.placement, "secondary");

  const edition = db
    .prepare("SELECT edition_number FROM edition_state WHERE user_id = ?")
    .get(USER_ID) as { edition_number: number };
  assert.equal(edition.edition_number, 6);

  const flash = db
    .prepare("SELECT text, story_id FROM flashes WHERE user_id = ? ORDER BY sort_order DESC LIMIT 1")
    .get(USER_ID) as { text: string; story_id: string };
  assert.equal(flash.text, "כותרת חדשה");
  assert.equal(flash.story_id, story.id);

  const digests = db
    .prepare("SELECT digests_json FROM edition_state WHERE user_id = ?")
    .get(USER_ID) as { digests_json: string };
  const parsedDigests = JSON.parse(digests.digests_json) as {
    section: string;
    items: { headline: string }[];
  }[];
  assert.ok(
    parsedDigests.some((digest) =>
      digest.items.some((item) => item.headline === "כותרת חדשה"),
    ),
  );

  const meta = db
    .prepare("SELECT section_counts_json FROM profile_meta WHERE user_id = ?")
    .get(USER_ID) as { section_counts_json: string };
  const sectionCounts = JSON.parse(meta.section_counts_json) as unknown[];
  assert.ok(sectionCounts.length > 0);
});

test("third POST /stories in a day is 429", async () => {
  closeDb();
  process.env.DATABASE_PATH = join(dbDir, "quota.sqlite");
  seedBaseUser();
  app = createStoriesRouter();

  const draft = {
    id: "d1",
    status: "ready" as const,
    angle: "זווית",
    headline: "ידיעה",
    standfirst: "משנה",
    paragraphs: ["פסקה"],
    pendingParagraph: null,
    checks: [],
    section: null,
  };

  for (let i = 0; i < 2; i++) {
    const res = await app.request("/stories", {
      method: "POST",
      headers: { Cookie: COOKIE, "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, headline: `ידיעה ${i + 1}` }),
    });
    assert.equal(res.status, 201);
  }

  const third = await app.request("/stories", {
    method: "POST",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, headline: "ידיעה 3" }),
  });
  assert.equal(third.status, 429);
  const body = (await third.json()) as { message: string };
  assert.equal(body.message, "הגעתם לשתי ידיעות להיום. מחר הכתב מחכה שוב.");
});

test("GET /stories/share/:token teasers guests and authors see the rest", async () => {
  closeDb();
  process.env.DATABASE_PATH = join(dbDir, "share.sqlite");
  seedBaseUser();
  app = createStoriesRouter();

  const body = JSON.stringify([
    { kind: "paragraph", text: "פסקה ראשונה." },
    { kind: "paragraph", text: "פסקה שנייה." },
  ]);
  getDb()
    .prepare(
      `INSERT INTO stories (
        id, user_id, section, section_name, edition_label, headline, standfirst,
        body_json, angle, byline, published_at, placement, created_at, share_token
      ) VALUES ('s1', ?, 'work', 'עבודה', 'המהדורה של בדיקה', 'כותרת', '', ?, '', 'כתב',
                '01.01.26, 10:00', 'lead', '2026-01-01T00:00:00.000Z', 'tok_share')`,
    )
    .run(USER_ID, body);

  const guest = await app.request("/stories/share/tok_share");
  assert.equal(guest.status, 200);
  const teaser = (await guest.json()) as {
    gated: boolean;
    connected: boolean;
    body: unknown[];
    author: { id: string };
  };
  assert.equal(teaser.gated, true);
  assert.equal(teaser.connected, false);
  assert.equal(teaser.body.length, 1);
  assert.equal(teaser.author.id, USER_ID);

  const author = await app.request("/stories/share/tok_share", { headers: { Cookie: COOKIE } });
  assert.equal(author.status, 200);
  const full = (await author.json()) as { gated: boolean; body: unknown[] };
  assert.equal(full.gated, false);
  assert.equal(full.body.length, 2);

  const missing = await app.request("/stories/share/nope");
  assert.equal(missing.status, 404);
});
