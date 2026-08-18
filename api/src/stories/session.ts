import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { getDb } from "../db.ts";

export type StoriesVariables = { userId: string };

const UNAUTHORIZED = { message: "יש להתחבר כדי להמשיך" };

/** Require a valid session cookie; sets `userId` on context. */
export async function requireSession(
  c: Context<{ Variables: StoriesVariables }>,
  next: Next,
): Promise<Response | void> {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionId) return c.json(UNAUTHORIZED, 401);

  const row = getDb()
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .get(sessionId) as { user_id: string; expires_at: string } | undefined;

  if (!row || row.expires_at <= new Date().toISOString()) {
    return c.json(UNAUTHORIZED, 401);
  }

  c.set("userId", row.user_id);
  await next();
}
