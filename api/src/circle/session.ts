import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { getDb } from "../db.ts";

export function resolveUserId(c: Context): string | null {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const row = getDb()
    .prepare(
      `SELECT user_id AS userId FROM sessions
       WHERE id = ? AND expires_at > datetime('now')`,
    )
    .get(sessionId) as { userId: string } | undefined;

  return row?.userId ?? null;
}

export function requireUser(c: Context): string | Response {
  const userId = resolveUserId(c);
  if (!userId) return c.json({ message: "צריך להיכנס לחשבון" }, 401);
  return userId;
}
