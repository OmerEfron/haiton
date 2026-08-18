import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before, beforeEach } from "node:test";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { closeDb, getDb } from "../db.ts";
import { createCircleRouter } from "./router.ts";

let tempDir = "";
let sessionId = "";
const userId = "u_test";

function resetDb(): void {
  closeDb();
  tempDir = mkdtempSync(join(tmpdir(), "iton-circle-"));
  process.env.DATABASE_PATH = join(tempDir, "test.sqlite");
  getDb();
}

function seedUserAndSession(): void {
  getDb()
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, initial, publishing_since)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, "בודק", "test@example.com", "x", "ב", "2026");

  sessionId = "sess_test_1";
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES (?, ?, datetime('now', '+1 day'))`,
    )
    .run(sessionId, userId);
}

function seedReaders(): void {
  const insert = getDb().prepare(
    `INSERT INTO readers (id, name, initial, detail) VALUES (?, ?, ?, ?)`,
  );
  insert.run("r1", "נועה שגב", "נ", "מהדורה פעילה · חיפה");
  insert.run("r2", "נועם שריד", "נ", "מהדורה פעילה · תל אביב");
}

function cookieHeader(): Record<string, string> {
  return { Cookie: `${SESSION_COOKIE_NAME}=${sessionId}` };
}

before(() => {
  resetDb();
});

after(() => {
  closeDb();
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  resetDb();
  seedUserAndSession();
  seedReaders();
});

test("searchReaders returns [] for blank q", async () => {
  const app = createCircleRouter();
  const res = await app.request("/readers?q=", { headers: cookieHeader() });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), []);
});

test("sendInvitation returns 400 when name missing and no reader", async () => {
  const app = createCircleRouter();
  const res = await app.request("/invitations", {
    method: "POST",
    headers: { ...cookieHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "   ",
      relation: "friend",
      section: "friends",
      settings: { seesMyEdition: true, showsFullName: true, notifyOnPublish: false },
    }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { message: string };
  assert.equal(body.message, "צריך לבחור קורא או להזין שם");
});

test("accept incoming invitation uses meta from POST invitation", async () => {
  const app = createCircleRouter();
  const postRes = await app.request("/invitations", {
    method: "POST",
    headers: { ...cookieHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "דוד כהן",
      relation: "family",
      section: "family",
      settings: { seesMyEdition: true, showsFullName: false, notifyOnPublish: true },
    }),
  });
  assert.equal(postRes.status, 200);
  const invitation = (await postRes.json()) as { id: string };

  getDb()
    .prepare(`UPDATE invitations SET direction = 'incoming' WHERE user_id = ? AND id = ?`)
    .run(userId, invitation.id);

  const res = await app.request(`/invitations/${invitation.id}/respond`, {
    method: "POST",
    headers: { ...cookieHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ accept: true }),
  });
  assert.equal(res.status, 204);

  const listRes = await app.request("/connections", { headers: cookieHeader() });
  const connections = (await listRes.json()) as {
    relation: string;
    section: string;
    settings: { seesMyEdition: boolean; showsFullName: boolean; notifyOnPublish: boolean };
  }[];

  assert.equal(connections.length, 1);
  assert.equal(connections[0].relation, "family");
  assert.equal(connections[0].section, "family");
  assert.deepEqual(connections[0].settings, {
    seesMyEdition: true,
    showsFullName: false,
    notifyOnPublish: true,
  });
});

test("accept incoming invitation creates a connection", async () => {
  getDb()
    .prepare(
      `INSERT INTO invitations (id, user_id, name, initial, detail, direction)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run("i_in", userId, "נועה שגב", "נ", "מבקשת חיבור", "incoming");

  const app = createCircleRouter();
  const res = await app.request("/invitations/i_in/respond", {
    method: "POST",
    headers: { ...cookieHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ accept: true }),
  });
  assert.equal(res.status, 204);

  const listRes = await app.request("/connections", { headers: cookieHeader() });
  const connections = (await listRes.json()) as {
    name: string;
    relation: string;
    section: string;
    relationLabel: string;
    settings: { seesMyEdition: boolean; showsFullName: boolean; notifyOnPublish: boolean };
  }[];

  assert.equal(connections.length, 1);
  assert.equal(connections[0].name, "נועה שגב");
  assert.equal(connections[0].relation, "friend");
  assert.equal(connections[0].section, "friends");
  assert.equal(connections[0].relationLabel, "חדש במעגל");
  assert.deepEqual(connections[0].settings, {
    seesMyEdition: true,
    showsFullName: true,
    notifyOnPublish: false,
  });
});

test("removeConnection returns 404 when missing", async () => {
  const app = createCircleRouter();
  const res = await app.request("/connections/missing", {
    method: "DELETE",
    headers: cookieHeader(),
  });
  assert.equal(res.status, 404);
  const body = (await res.json()) as { message: string };
  assert.equal(body.message, "החיבור לא נמצא");
});

test("listSuggestedConnections omits already-connected reader names", async () => {
  getDb()
    .prepare(
      `INSERT INTO connections
       (id, user_id, name, initial, relation_label, relation, section, section_name, status, story_count, settings_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'connected', 0, '{}')`,
    )
    .run("c1", userId, "נועה שגב", "נ", "חברה", "friend", "friends", "חברים");

  const app = createCircleRouter();
  const res = await app.request("/connections/suggested", { headers: cookieHeader() });
  assert.equal(res.status, 200);
  const suggested = (await res.json()) as { name: string }[];
  assert.ok(!suggested.some((row) => row.name === "נועה שגב"));
  assert.ok(suggested.some((row) => row.name === "נועם שריד"));
});

test("getCircleSummary counts connections with lastPublished", async () => {
  getDb()
    .prepare(
      `INSERT INTO connections
       (id, user_id, name, initial, relation_label, relation, section, section_name,
        status, story_count, last_published, settings_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'connected', 0, ?, '{}'),
              (?, ?, ?, ?, ?, ?, ?, ?, 'connected', 0, NULL, '{}')`,
    )
    .run(
      "c1",
      userId,
      "א",
      "א",
      "חבר",
      "friend",
      "friends",
      "חברים",
      "2026-01-01",
      "c2",
      userId,
      "ב",
      "ב",
      "חבר",
      "friend",
      "friends",
      "חברים",
    );

  const app = createCircleRouter();
  const res = await app.request("/connections/summary", { headers: cookieHeader() });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { updatedThisWeek: number; connections: number };
  assert.equal(body.updatedThisWeek, 1);
  assert.equal(body.connections, 2);
});

test("getCircleSummary uses zero updatedThisWeek when none published", async () => {
  const app = createCircleRouter();
  const res = await app.request("/connections/summary", { headers: cookieHeader() });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { updatedThisWeek: number };
  assert.equal(body.updatedThisWeek, 0);
});
