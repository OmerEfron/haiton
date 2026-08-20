import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { ERROR_DAILY_QUOTA, ERROR_INTERVIEW_NOT_FOUND } from "../contract.ts";
import { closeDb, getDb } from "../db.ts";
import { createDeskRouter } from "./router.ts";

const USER_ID = "u-desk";
const SESSION_ID = "sess-desk";
const COOKIE = `iton_session=${SESSION_ID}`;

let dbDir: string;
let app: ReturnType<typeof createDeskRouter>;

function snapshot(
  id: string,
  headline: string | null,
  exhausted = false,
  startedAt = "2026-08-19T08:00:00.000Z",
) {
  return {
    id,
    startedAt,
    elapsedLabel: "0 דק'",
    factsLocked: 0,
    angleChosen: exhausted,
    messages: headline
      ? [{ id: "m1", role: "reader", text: "פתיחה", at: "2026-08-19T08:00:00.000Z" }]
      : [],
    reporterTyping: false,
    draft: {
      id: "d1",
      status: exhausted ? "ready" : "empty",
      angle: null,
      headline,
      standfirst: null,
      paragraphs: [] as string[],
      pendingParagraph: null,
      checks: [] as { label: string; done: boolean }[],
      section: null,
    },
    openers: [] as string[],
    exhausted,
    type: null,
    tone: null,
  };
}

before(() => {
  dbDir = mkdtempSync(join(tmpdir(), "iton-desk-"));
  process.env.DATABASE_PATH = join(dbDir, "test.sqlite");
  closeDb();
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial)
     VALUES (?, 'בדיקה', 'desk@example.com', 'x', 'ב')`,
  ).run(USER_ID);
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    SESSION_ID,
    USER_ID,
    "2099-01-01T00:00:00.000Z",
  );
  app = createDeskRouter();
});

after(() => {
  closeDb();
  rmSync(dbDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
});

test("GET /quota starts at zero", async () => {
  const res = await app.request("/quota", { headers: { Cookie: COOKIE } });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { limit: number; used: number; remaining: number };
  assert.equal(body.limit, 2);
  assert.equal(body.used, 0);
  assert.equal(body.remaining, 2);
});

test("PUT same interview id twice does not consume a second slot", async () => {
  const first = await app.request("/desk/interviews/i1", {
    method: "PUT",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify(snapshot("i1", null)),
  });
  assert.equal(first.status, 200);

  const second = await app.request("/desk/interviews/i1", {
    method: "PUT",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify(snapshot("i1", "כותרת מעודכנת", true)),
  });
  assert.equal(second.status, 200);

  const quota = await app.request("/quota", { headers: { Cookie: COOKIE } });
  const body = (await quota.json()) as { used: number };
  assert.equal(body.used, 1);

  const got = await app.request("/desk/interviews/i1", { headers: { Cookie: COOKIE } });
  const session = (await got.json()) as { draft: { headline: string }; exhausted: boolean };
  assert.equal(session.draft.headline, "כותרת מעודכנת");
  assert.equal(session.exhausted, true);
});

test("third distinct interview in a day is 429", async () => {
  const two = await app.request("/desk/interviews/i2", {
    method: "PUT",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify(snapshot("i2", "שנייה", false, "2026-08-19T09:00:00.000Z")),
  });
  assert.equal(two.status, 200);

  const three = await app.request("/desk/interviews/i3", {
    method: "PUT",
    headers: { Cookie: COOKIE, "Content-Type": "application/json" },
    body: JSON.stringify(snapshot("i3", "שלישית")),
  });
  assert.equal(three.status, 429);
  const body = (await three.json()) as { message: string };
  assert.equal(body.message, ERROR_DAILY_QUOTA);
  assert.ok(three.headers.get("Retry-After"));
});

test("GET /desk/interviews lists newest first", async () => {
  const res = await app.request("/desk/interviews", { headers: { Cookie: COOKIE } });
  assert.equal(res.status, 200);
  const list = (await res.json()) as { id: string; headline: string | null }[];
  assert.equal(list.length, 2);
  assert.equal(list[0].id, "i2");
  assert.equal(list[1].id, "i1");
});

test("GET missing interview is 404", async () => {
  const res = await app.request("/desk/interviews/nope", { headers: { Cookie: COOKIE } });
  assert.equal(res.status, 404);
  const body = (await res.json()) as { message: string };
  assert.equal(body.message, ERROR_INTERVIEW_NOT_FOUND);
});

test("GET /desk/brief returns subject, facts, circle, and recent", async () => {
  const db = getDb();
  db.prepare("UPDATE users SET city = ?, headline = ? WHERE id = ?").run(
    "חיפה",
    "מפתח",
    USER_ID,
  );
  db.prepare(
    `INSERT INTO facts (id, user_id, category, text, used_in_stories)
     VALUES ('k1', ?, 'work', 'מפתח בחיפה', 0)`,
  ).run(USER_ID);
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial)
     VALUES ('u-friend', 'דנה כהן', 'dana@example.com', 'x', 'ד')`,
  ).run();
  db.prepare(
    `INSERT INTO connections
     (id, user_id, connected_user_id, name, initial, relation_label, relation,
      section, section_name, status, story_count, settings_json)
     VALUES ('c1', ?, 'u-friend', 'דנה כהן', 'ד', 'שכנה', 'neighbour',
             'friends', 'חברים', 'connected', 0, '{}')`,
  ).run(USER_ID);
  db.prepare(
    `INSERT INTO stories (
      id, user_id, section, section_name, edition_label, headline, standfirst,
      body_json, angle, byline, published_at, placement, created_at
    ) VALUES ('1', ?, 'work', 'עבודה', 'מהדורה', 'המשוב הראשון', '',
              '[]', 'עבודה', 'כתב', '01.01.26', 'lead', '2026-08-01T00:00:00.000Z')`,
  ).run(USER_ID);

  const res = await app.request("/desk/brief", { headers: { Cookie: COOKIE } });
  assert.equal(res.status, 200);
  const brief = (await res.json()) as {
    subject: { name: string; city?: string; headline?: string };
    facts: { text: string }[];
    circle: { name: string; relationLabel: string }[];
    recent: { headline: string; angle: string }[];
  };
  assert.equal(brief.subject.name, "בדיקה");
  assert.equal(brief.subject.city, "חיפה");
  assert.equal(brief.subject.headline, "מפתח");
  assert.equal(brief.facts.length, 1);
  assert.equal(brief.facts[0]?.text, "מפתח בחיפה");
  assert.equal(brief.circle.length, 1);
  assert.equal(brief.circle[0]?.name, "דנה כהן");
  assert.equal(brief.circle[0]?.relationLabel, "שכנה");
  assert.equal(brief.recent.length, 1);
  assert.equal(brief.recent[0]?.headline, "המשוב הראשון");
});
