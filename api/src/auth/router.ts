import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { closeDb, getDb } from "../db.ts";
import type { Session, User } from "../types.ts";
import { getLogger } from "../log/logger.ts";
import { provisionUser } from "../provision.ts";
import { assertPasswordOk, hashPassword, verifyPassword } from "./password.ts";

const SIGN_IN_ERROR = "צריך דוא״ל וסיסמה כדי להיכנס";
const SIGN_IN_BAD_CREDS = "דוא״ל או סיסמה שגויים";
const SIGN_UP_ERROR = "צריך שם, דוא״ל וסיסמה כדי לפתוח מהדורה";
const SIGN_UP_EMAIL_EXISTS_ERROR = "הדוא״ל הזה כבר רשום";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

type UserRow = {
  id: string;
  name: string;
  email: string;
  initial: string;
  age: number | null;
  city: string | null;
  headline: string | null;
};

function rowToUser(row: UserRow): User {
  const user: User = {
    id: row.id,
    name: row.name,
    email: row.email,
    initial: row.initial,
  };
  if (row.age != null) user.age = row.age;
  if (row.city) user.city = row.city;
  if (row.headline) user.headline = row.headline;
  return user;
}

function loadSession(userId: string): Session | null {
  const row = getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.initial, u.age, u.city, u.headline,
              es.edition_name AS edition_name
       FROM users u
       JOIN edition_settings es ON es.user_id = u.id
       WHERE u.id = ?`,
    )
    .get(userId) as (UserRow & { edition_name: string }) | undefined;
  if (!row) return null;
  return { user: rowToUser(row), editionName: row.edition_name };
}

function createSession(userId: string): string {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(id, userId, expiresAt);
  return id;
}

function cookieOpts() {
  const crossSite = process.env.COOKIE_SAMESITE === "None";
  return {
    httpOnly: true,
    path: "/",
    sameSite: (crossSite ? "None" : "Lax") as "None" | "Lax",
    secure: crossSite || process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  };
}

function setSessionCookie(c: Parameters<typeof setCookie>[0], sessionId: string): void {
  setCookie(c, SESSION_COOKIE_NAME, sessionId, cookieOpts());
}

function sessionFromCookie(c: Parameters<typeof getCookie>[0]): Session | null {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const row = getDb()
    .prepare(
      `SELECT user_id FROM sessions
       WHERE id = ? AND datetime(expires_at) > datetime('now')`,
    )
    .get(sessionId) as { user_id: string } | undefined;
  if (!row) return null;
  return loadSession(row.user_id);
}

function badRequest(c: Parameters<typeof setCookie>[0], message: string) {
  return c.json({ message }, 400);
}

export const authRouter = new Hono()
  .get("/auth/session", (c) => c.json(sessionFromCookie(c)))
  .post("/auth/sign-in", async (c) => {
    const body = (await c.req.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password?.trim() ?? "";
    if (!email || !password) return badRequest(c, SIGN_IN_ERROR);

    const user = getDb()
      .prepare(
        "SELECT id, password_hash FROM users WHERE email = ? COLLATE NOCASE",
      )
      .get(email) as { id: string; password_hash: string } | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return badRequest(c, SIGN_IN_BAD_CREDS);
    }

    const sessionId = createSession(user.id);
    setSessionCookie(c, sessionId);
    const session = loadSession(user.id);
    if (!session) return c.json({ message: "Session failed" }, 500);
    return c.json(session);
  })
  .post("/auth/sign-up", async (c) => {
    const body = (await c.req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const password = body.password?.trim() ?? "";
    if (!name || !email || !password) return badRequest(c, SIGN_UP_ERROR);
    const passwordError = assertPasswordOk(password);
    if (passwordError) return badRequest(c, passwordError);

    const userId = randomUUID();
    const initial = [...name][0] ?? name.charAt(0);
    const editionName = `המהדורה של ${name}`;
    const db = getDb();

    try {
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, initial)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(userId, name, email, hashPassword(password), initial);
      db.prepare(
        `INSERT INTO edition_settings (user_id, edition_name) VALUES (?, ?)`,
      ).run(userId, editionName);
      provisionUser(db, userId, editionName);
    } catch {
      getLogger().info({ event: "auth.signup_conflict" }, "signup conflict");
      return badRequest(c, SIGN_UP_EMAIL_EXISTS_ERROR);
    }

    const sessionId = createSession(userId);
    setSessionCookie(c, sessionId);
    const session = loadSession(userId);
    if (!session) return c.json({ message: "Session failed" }, 500);
    return c.json(session);
  })
  .post("/auth/sign-out", (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);
    if (sessionId) {
      getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    }
    deleteCookie(c, SESSION_COOKIE_NAME, cookieOpts());
    return c.body(null, 204);
  });

/** Test helper — reset shared db between cases. */
export function resetAuthDb(): void {
  closeDb();
}
