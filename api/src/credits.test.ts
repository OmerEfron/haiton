import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { createApp } from "./app.ts";
import { DAILY_CREDITS_DEFAULT, ERROR_DAILY_QUOTA } from "./contract.ts";
import { balance, charge, grant } from "./credits.ts";
import { closeDb, getDb } from "./db.ts";
import { israelDay } from "./quota.ts";

const USER_ID = "u-credits";
const EMAIL = "credits@example.com";
const ADMIN_USER = "u-credits-admin";
const ADMIN_EMAIL = "credits.admin@example.com";
const ADMIN = "test-admin-secret";

let dbDir: string;
let app: ReturnType<typeof createApp>;

before(() => {
  dbDir = mkdtempSync(join(tmpdir(), "iton-credits-"));
  process.env.DATABASE_PATH = join(dbDir, "test.sqlite");
  process.env.ADMIN_SECRET = ADMIN;
  delete process.env.DAILY_CREDITS;
  closeDb();
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial)
     VALUES (?, 'בדיקה', ?, 'x', 'ב')`,
  ).run(USER_ID, EMAIL);
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial)
     VALUES (?, 'מנהל', ?, 'x', 'מ')`,
  ).run(ADMIN_USER, ADMIN_EMAIL);
  app = createApp();
});

after(() => {
  closeDb();
  rmSync(dbDir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
  delete process.env.ADMIN_SECRET;
});

test("daily pool: charge, grant, ignore other days, then 429", () => {
  const start = balance(USER_ID);
  assert.equal(start.limit, DAILY_CREDITS_DEFAULT);
  assert.equal(start.used, 0);
  assert.equal(start.remaining, 10);

  const afterQuestion = charge(USER_ID, "question");
  assert.equal(afterQuestion.ok, true);
  if (afterQuestion.ok) {
    assert.equal(afterQuestion.quota.used, 1);
    assert.equal(afterQuestion.quota.remaining, 9);
  }

  const afterDraft = charge(USER_ID, "draft");
  assert.equal(afterDraft.ok, true);
  if (afterDraft.ok) {
    assert.equal(afterDraft.quota.used, 3);
    assert.equal(afterDraft.quota.remaining, 7);
  }

  getDb()
    .prepare(
      `INSERT INTO credit_events (user_id, day, delta, kind) VALUES (?, '1999-01-01', -10, 'question')`,
    )
    .run(USER_ID);
  assert.equal(balance(USER_ID).remaining, 7);

  const granted = grant(USER_ID, 5);
  assert.equal(granted.limit, 15);
  assert.equal(granted.used, 3);
  assert.equal(granted.remaining, 12);

  for (let i = 0; i < 6; i++) {
    const step = charge(USER_ID, "draft");
    assert.equal(step.ok, true);
  }
  assert.equal(balance(USER_ID).remaining, 0);

  const blocked = charge(USER_ID, "question");
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.status, 429);
    assert.equal(blocked.message, ERROR_DAILY_QUOTA);
  }
  assert.equal(israelDay().length, 10);
});

test("admin grant and inspect", async () => {
  const missing = await app.request("/admin/credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, amount: 3 }),
  });
  assert.equal(missing.status, 401);

  const unknown = await app.request("/admin/credits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": ADMIN,
    },
    body: JSON.stringify({ email: "nobody@example.com", amount: 3 }),
  });
  assert.equal(unknown.status, 404);

  const added = await app.request("/admin/credits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": ADMIN,
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, amount: 3 }),
  });
  assert.equal(added.status, 200);
  const body = (await added.json()) as { remaining: number; email: string };
  assert.equal(body.email, ADMIN_EMAIL);
  assert.equal(body.remaining, 13);

  const got = await app.request(`/admin/credits?email=${encodeURIComponent(ADMIN_EMAIL)}`, {
    headers: { "X-Admin-Secret": ADMIN },
  });
  assert.equal(got.status, 200);
  const inspect = (await got.json()) as { remaining: number };
  assert.equal(inspect.remaining, 13);
});

test("admin is 503 when secret is unset", async () => {
  const prev = process.env.ADMIN_SECRET;
  delete process.env.ADMIN_SECRET;
  const res = await app.request(`/admin/credits?email=${encodeURIComponent(ADMIN_EMAIL)}`, {
    headers: { "X-Admin-Secret": ADMIN },
  });
  process.env.ADMIN_SECRET = prev;
  assert.equal(res.status, 503);
});
