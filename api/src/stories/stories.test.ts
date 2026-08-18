import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
        body_json, angle, byline, published_at, placement
      ) VALUES (?, ?, ?, ?, ?, ?, '', '[]', '', 'כתב', '01.01.26, 10:00', ?)`,
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
    section: "work" as const,
  };

  const res = await app.request("/stories", {
    method: "POST",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  assert.equal(res.status, 201);

  const story = (await res.json()) as { id: string; placement: string; ownEdition: boolean };
  assert.equal(story.placement, "lead");
  assert.equal(story.ownEdition, true);

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
});
