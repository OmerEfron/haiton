import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Hono } from "hono";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { closeDb, getDb } from "../db.ts";
import { kartesetRouter } from "./router.ts";

const USER_ID = "u_karteset_test";
const SESSION_ID = "sess_karteset_test";

function setup(): string {
  const dir = mkdtempSync(join(tmpdir(), "iton-karteset-"));
  process.env.DATABASE_PATH = join(dir, "test.sqlite");
  closeDb();

  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial, publishing_since)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(USER_ID, "Test User", "test@example.com", "hash", "T", "2024");

  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))`,
  ).run(SESSION_ID, USER_ID);

  db.prepare(`INSERT INTO profile_stats (user_id, facts) VALUES (?, 0)`).run(USER_ID);

  return dir;
}

function teardown(dir: string): void {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
}

function app(): Hono {
  const hono = new Hono();
  hono.route("/", kartesetRouter);
  return hono;
}

function cookie(): string {
  return `${SESSION_COOKIE_NAME}=${SESSION_ID}`;
}

test("GET /karteset/facts lists facts for session user", async () => {
  const dir = setup();
  try {
    getDb()
      .prepare(
        `INSERT INTO facts (id, user_id, category, text, used_in_stories, updated_label)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run("k1", USER_ID, "work", "fact one", 2, null);

    const res = await app().request("/karteset/facts", {
      headers: { Cookie: cookie() },
    });

    assert.equal(res.status, 200);
    const facts = (await res.json()) as { id: string; text: string }[];
    assert.equal(facts.length, 1);
    assert.equal(facts[0]?.id, "k1");
    assert.equal(facts[0]?.text, "fact one");
  } finally {
    teardown(dir);
  }
});

test("POST /karteset/facts adds fact and bumps profile stats", async () => {
  const dir = setup();
  try {
    const res = await app().request("/karteset/facts", {
      method: "POST",
      headers: { Cookie: cookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: "  new fact  ", category: "personal" }),
    });

    assert.equal(res.status, 200);
    const fact = (await res.json()) as {
      id: string;
      text: string;
      usedInStories: number;
      updatedLabel?: string;
    };
    assert.ok(fact.id.startsWith("k_"));
    assert.equal(fact.text, "new fact");
    assert.equal(fact.usedInStories, 0);
    assert.equal(fact.updatedLabel, "נרשם עכשיו");

    const stats = getDb()
      .prepare(`SELECT facts FROM profile_stats WHERE user_id = ?`)
      .get(USER_ID) as { facts: number };
    assert.equal(stats.facts, 1);
  } finally {
    teardown(dir);
  }
});

test("POST /karteset/facts rejects empty text", async () => {
  const dir = setup();
  try {
    const res = await app().request("/karteset/facts", {
      method: "POST",
      headers: { Cookie: cookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   ", category: "work" }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "אי אפשר לרשום עובדה ריקה");
  } finally {
    teardown(dir);
  }
});

test("PATCH /karteset/facts/:id updates fact", async () => {
  const dir = setup();
  try {
    getDb()
      .prepare(
        `INSERT INTO facts (id, user_id, category, text, used_in_stories)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run("k2", USER_ID, "family", "old text", 1);

    const res = await app().request("/karteset/facts/k2", {
      method: "PATCH",
      headers: { Cookie: cookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: "updated text", category: "routine" }),
    });

    assert.equal(res.status, 200);
    const fact = (await res.json()) as {
      text: string;
      category: string;
      updatedLabel?: string;
    };
    assert.equal(fact.text, "updated text");
    assert.equal(fact.category, "routine");
    assert.equal(fact.updatedLabel, "עודכן עכשיו");
  } finally {
    teardown(dir);
  }
});

test("PATCH /karteset/facts/:id rejects empty text", async () => {
  const dir = setup();
  try {
    getDb()
      .prepare(
        `INSERT INTO facts (id, user_id, category, text, used_in_stories)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run("k3", USER_ID, "work", "keep", 0);

    const res = await app().request("/karteset/facts/k3", {
      method: "PATCH",
      headers: { Cookie: cookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "אי אפשר לרשום עובדה ריקה");
  } finally {
    teardown(dir);
  }
});

test("PATCH /karteset/facts/:id returns 404 for missing fact", async () => {
  const dir = setup();
  try {
    const res = await app().request("/karteset/facts/missing", {
      method: "PATCH",
      headers: { Cookie: cookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: "nope" }),
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "העובדה לא נמצאה בכרטסת");
  } finally {
    teardown(dir);
  }
});

test("DELETE /karteset/facts/:id removes fact and decrements stats", async () => {
  const dir = setup();
  try {
    getDb()
      .prepare(
        `INSERT INTO facts (id, user_id, category, text, used_in_stories)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run("k4", USER_ID, "work", "delete me", 0);
    getDb()
      .prepare(`UPDATE profile_stats SET facts = 1 WHERE user_id = ?`)
      .run(USER_ID);

    const res = await app().request("/karteset/facts/k4", {
      method: "DELETE",
      headers: { Cookie: cookie() },
    });

    assert.equal(res.status, 204);

    const count = getDb()
      .prepare(`SELECT COUNT(*) AS n FROM facts WHERE user_id = ?`)
      .get(USER_ID) as { n: number };
    assert.equal(count.n, 0);

    const stats = getDb()
      .prepare(`SELECT facts FROM profile_stats WHERE user_id = ?`)
      .get(USER_ID) as { facts: number };
    assert.equal(stats.facts, 0);
  } finally {
    teardown(dir);
  }
});

test("DELETE /karteset/facts/:id returns 404 for missing fact", async () => {
  const dir = setup();
  try {
    const res = await app().request("/karteset/facts/nope", {
      method: "DELETE",
      headers: { Cookie: cookie() },
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "העובדה לא נמצאה בכרטסת");
  } finally {
    teardown(dir);
  }
});
