import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Hono } from "hono";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { closeDb, getDb } from "../db.ts";
import type { Session } from "../types.ts";
import { authRouter, resetAuthDb } from "./index.ts";
import { hashPassword } from "./password.ts";

const SEED_EMAIL = "omer@example.com";
const SEED_PASSWORD = "iton-dev";

function makeApp(): Hono {
  const app = new Hono();
  app.route("/", authRouter);
  return app;
}

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "iton-auth-"));
  return join(dir, "test.sqlite");
}

function seedUser(dbPath: string): void {
  process.env.DATABASE_PATH = dbPath;
  resetAuthDb();
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("u1", "עומר עפרון", SEED_EMAIL, hashPassword(SEED_PASSWORD), "ע");
  db.prepare(
    `INSERT INTO edition_settings (user_id, edition_name) VALUES (?, ?)`,
  ).run("u1", "המהדורה של עומר עפרון");
}

function cookieFromResponse(res: Response): string | undefined {
  const raw = res.headers.get("set-cookie");
  if (!raw) return undefined;
  const match = raw.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match?.[1];
}

test("sign-in returns 400 for empty fields", async () => {
  const dbPath = tempDbPath();
  try {
    seedUser(dbPath);
    const app = makeApp();
    const res = await app.request("/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", password: "" }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "צריך דוא״ל וסיסמה כדי להיכנס");
  } finally {
    resetAuthDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test("sign-in returns Session and sets cookie", async () => {
  const dbPath = tempDbPath();
  try {
    seedUser(dbPath);
    const app = makeApp();
    const res = await app.request("/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    });
    assert.equal(res.status, 200);
    const session = (await res.json()) as Session;
    assert.equal(session.user.email, SEED_EMAIL);
    assert.equal(session.editionName, "המהדורה של עומר עפרון");
    assert.ok(cookieFromResponse(res));
  } finally {
    resetAuthDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test("session cookie round-trip", async () => {
  const dbPath = tempDbPath();
  try {
    seedUser(dbPath);
    const app = makeApp();

    const signIn = await app.request("/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    });
    const cookie = cookieFromResponse(signIn);
    assert.ok(cookie);

    const sessionRes = await app.request("/auth/session", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(sessionRes.status, 200);
    const session = (await sessionRes.json()) as Session;
    assert.equal(session.user.email, SEED_EMAIL);

    const missing = await app.request("/auth/session");
    assert.equal(missing.status, 200);
    assert.equal(await missing.json(), null);
  } finally {
    resetAuthDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test("sign-up of an existing email signs in when the password matches", async () => {
  const dbPath = tempDbPath();
  try {
    seedUser(dbPath);
    const app = makeApp();
    const res = await app.request("/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "עומר עפרון",
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
      }),
    });
    assert.equal(res.status, 200);
    const session = (await res.json()) as Session;
    assert.equal(session.user.email, SEED_EMAIL);
    assert.ok(cookieFromResponse(res));
  } finally {
    resetAuthDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test("sign-out clears session", async () => {
  const dbPath = tempDbPath();
  try {
    seedUser(dbPath);
    const app = makeApp();

    const signIn = await app.request("/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    });
    const cookie = cookieFromResponse(signIn);
    assert.ok(cookie);

    const signOut = await app.request("/auth/sign-out", {
      method: "POST",
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(signOut.status, 204);

    const after = await app.request("/auth/session", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(after.status, 200);
    assert.equal(await after.json(), null);
  } finally {
    resetAuthDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
  }
});

test.after(() => {
  closeDb();
});
