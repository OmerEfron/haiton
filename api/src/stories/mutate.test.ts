import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { closeDb, getDb } from "../db.ts";
import type { FrontPage, Story } from "../types.ts";
import { createStoriesRouter } from "./router.ts";

const USER_ID = "u-mutate";
const SESSION_ID = "sess-mutate";
const COOKIE = `iton_session=${SESSION_ID}`;

const READY_DRAFT = {
  id: "d1",
  status: "ready" as const,
  angle: "זווית",
  headline: "כותרת",
  standfirst: "משנה",
  paragraphs: ["פסקה ראשונה.", "פסקה שנייה."],
  pendingParagraph: null,
  checks: [],
  section: null,
};

let dbDir: string;
let app: ReturnType<typeof createStoriesRouter>;

function seedBaseUser(dateShort = "ראשון, 01.01.26", dateLong = "יום ראשון"): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial)
     VALUES (?, 'בדיקה', 'mutate@example.com', 'x', 'ב')`,
  ).run(USER_ID);
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    SESSION_ID,
    USER_ID,
    "2099-01-01T00:00:00.000Z",
  );
  db.prepare("INSERT INTO edition_settings (user_id, edition_name) VALUES (?, ?)").run(
    USER_ID,
    "המהדורה של בדיקה",
  );
  db.prepare(
    `INSERT INTO edition_state (user_id, edition_number, date_long, date_short, ticker_json, digests_json)
     VALUES (?, 5, ?, ?, '[]', '[]')`,
  ).run(USER_ID, dateLong, dateShort);
  db.prepare(
    "INSERT INTO profile_stats (user_id, stories_published, flashes, drafts_in_progress) VALUES (?, 0, 0, 0)",
  ).run(USER_ID);
  db.prepare(
    "INSERT INTO profile_meta (user_id, section_counts_json, archive_json) VALUES (?, '[]', '[]')",
  ).run(USER_ID);
}

function resetDb(file: string, dateShort?: string, dateLong?: string): void {
  closeDb();
  process.env.DATABASE_PATH = join(dbDir, file);
  seedBaseUser(dateShort, dateLong);
  app = createStoriesRouter();
}

async function publish(headline: string): Promise<Story> {
  const res = await app.request("/stories", {
    method: "POST",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify({ ...READY_DRAFT, headline }),
  });
  assert.equal(res.status, 201);
  return (await res.json()) as Story;
}

function slotIds(page: FrontPage): string[] {
  return [page.lead, ...page.secondary, ...page.list]
    .filter((s): s is Story => s != null)
    .map((s) => s.id);
}

before(() => {
  dbDir = mkdtempSync(join(tmpdir(), "iton-mutate-"));
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

test("PATCH hidden drops from edition/ticker/flashes; share GET still works", async () => {
  resetDb("hide.sqlite");
  const older = await publish("ידיעה ישנה");
  const lead = await publish("ידיעה מוסתרת");

  const hide = await app.request(`/stories/${lead.id}`, {
    method: "PATCH",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify({ hidden: true }),
  });
  assert.equal(hide.status, 200);
  const hiddenStory = (await hide.json()) as Story;
  assert.equal(hiddenStory.hidden, true);

  const page = (await (
    await app.request("/editions/current", { headers: { Cookie: COOKIE } })
  ).json()) as FrontPage;
  assert.ok(!slotIds(page).includes(lead.id));
  assert.ok(slotIds(page).includes(older.id));
  assert.ok(!page.ticker.includes("ידיעה מוסתרת"));
  assert.ok(!page.flashes.some((f) => f.storyId === lead.id));
  assert.ok(!page.digests.some((d) => d.items.some((item) => item.id === lead.id)));

  const briefs = (await (
    await app.request("/flashes", { headers: { Cookie: COOKIE } })
  ).json()) as { flashes: { storyId?: string }[] };
  assert.ok(!briefs.flashes.some((f) => f.storyId === lead.id));

  const share = await app.request(`/stories/share/${lead.shareToken}`);
  assert.equal(share.status, 200);

  const archive = (await (
    await app.request("/stories", { headers: { Cookie: COOKIE } })
  ).json()) as Story[];
  assert.equal(archive.find((s) => s.id === lead.id)?.hidden, true);

  const show = await app.request(`/stories/${lead.id}`, {
    method: "PATCH",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify({ hidden: false }),
  });
  assert.equal(show.status, 200);
  assert.equal(((await show.json()) as Story).hidden, false);

  const restored = (await (
    await app.request("/editions/current", { headers: { Cookie: COOKIE } })
  ).json()) as FrontPage;
  assert.ok(slotIds(restored).includes(lead.id));
  assert.ok(restored.ticker.includes("ידיעה מוסתרת"));
  assert.ok(restored.flashes.some((f) => f.storyId === lead.id));
});

test("DELETE /stories/:id removes the row and 404s share", async () => {
  resetDb("delete.sqlite");
  const story = await publish("ידיעה למחיקה");
  const token = story.shareToken;

  const gone = await app.request(`/stories/${story.id}`, {
    method: "DELETE",
    headers: { Cookie: COOKIE },
  });
  assert.equal(gone.status, 204);

  const get = await app.request(`/stories/${story.id}`, { headers: { Cookie: COOKIE } });
  assert.equal(get.status, 404);
  const share = await app.request(`/stories/share/${token}`);
  assert.equal(share.status, 404);

  const stats = getDb()
    .prepare("SELECT stories_published, flashes FROM profile_stats WHERE user_id = ?")
    .get(USER_ID) as { stories_published: number; flashes: number };
  assert.equal(stats.stories_published, 0);
  assert.equal(stats.flashes, 0);
});

test("PATCH /stories/:id updates headline, standfirst, body", async () => {
  resetDb("patch.sqlite");
  const story = await publish("כותרת ישנה");

  const res = await app.request(`/stories/${story.id}`, {
    method: "PATCH",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify({
      headline: "כותרת חדשה",
      standfirst: "משנה חדשה",
      body: ["פסקה מעודכנת."],
    }),
  });
  assert.equal(res.status, 200);
  const updated = (await res.json()) as Story;
  assert.equal(updated.headline, "כותרת חדשה");
  assert.equal(updated.standfirst, "משנה חדשה");
  assert.equal(updated.body[0]?.kind, "paragraph");
  assert.equal(
    updated.body[0] && "text" in updated.body[0] ? updated.body[0].text : "",
    "מעודכנת.",
  );

  const flash = getDb()
    .prepare("SELECT text FROM flashes WHERE user_id = ? AND story_id = ?")
    .get(USER_ID, story.id) as { text: string };
  assert.equal(flash.text, "כותרת חדשה");
});

test("first publish stamps edition_state dates when they are empty", async () => {
  resetDb("stamp.sqlite", "", "");
  await publish("ידיעה ראשונה");
  const state = getDb()
    .prepare("SELECT date_long, date_short FROM edition_state WHERE user_id = ?")
    .get(USER_ID) as { date_long: string; date_short: string };
  assert.match(state.date_short, /^.+, \d{2}\.\d{2}\.\d{2}$/);
  assert.match(state.date_long, /^יום .+, \d{1,2} ב.+ \d{4}$/);
});

test("PATCH /stories/:id returns 404 for a missing story", async () => {
  resetDb("missing.sqlite");
  const res = await app.request("/stories/999", {
    method: "PATCH",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify({ hidden: true }),
  });
  assert.equal(res.status, 404);
});
