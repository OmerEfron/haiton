import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { ERROR_UNAUTHORIZED, SESSION_COOKIE_NAME } from "../contract.ts";
import { getDb } from "../db.ts";

export type StoriesVariables = { userId: string };

const UNAUTHORIZED = { message: ERROR_UNAUTHORIZED };

export function sessionUserId(c: Context): string | null {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const row = getDb()
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .get(sessionId) as { user_id: string; expires_at: string } | undefined;

  if (!row || row.expires_at <= new Date().toISOString()) return null;
  return row.user_id;
}

/** Require a valid session cookie; sets `userId` on context. */
export async function requireSession(
  c: Context<{ Variables: StoriesVariables }>,
  next: Next,
): Promise<Response | void> {
  const userId = sessionUserId(c);
  if (!userId) return c.json(UNAUTHORIZED, 401);
  c.set("userId", userId);
  await next();
}

/** Attach `userId` when a valid session exists; otherwise leave it empty. */
export async function optionalSession(
  c: Context<{ Variables: StoriesVariables }>,
  next: Next,
): Promise<void> {
  c.set("userId", sessionUserId(c) ?? "");
  await next();
}
