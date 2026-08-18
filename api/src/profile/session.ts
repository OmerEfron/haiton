import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { getDb } from "../db.ts";

/** Resolve the authenticated user id from the session cookie, or null. */
export function getSessionUserId(c: Context): string | null {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const row = getDb()
    .prepare(
      `SELECT user_id FROM sessions
       WHERE id = ? AND datetime(expires_at) > datetime('now')`,
    )
    .get(sessionId) as { user_id: string } | undefined;

  return row?.user_id ?? null;
}
