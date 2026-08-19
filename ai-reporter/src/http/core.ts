import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import { ERROR_INTERNAL } from "../contract.js";
import type { InterviewSession } from "./types.js";

export type SaveInterviewResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export type GetUserIdFn = (cookie: string) => Promise<string | null>;
export type SaveInterviewFn = (
  cookie: string,
  session: InterviewSession,
) => Promise<SaveInterviewResult>;

const DEFAULT_CORE = "http://localhost:8787";

function coreUrl(): string {
  return process.env.CORE_API_URL?.trim() || DEFAULT_CORE;
}

async function coreFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${coreUrl()}${path}`, init);
  } catch {
    throw new HTTPException(503, { message: ERROR_INTERNAL });
  }
}

export async function coreGetUserId(cookie: string): Promise<string | null> {
  if (!cookie) return null;
  const res = await coreFetch("/auth/session", {
    headers: { Cookie: cookie },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { user?: { id?: string } } | null;
  return body?.user?.id ?? null;
}

export async function coreSaveInterview(
  cookie: string,
  session: InterviewSession,
): Promise<SaveInterviewResult> {
  let res: Response;
  try {
    res = await coreFetch(`/desk/interviews/${encodeURIComponent(session.id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(session),
    });
  } catch (err) {
    if (err instanceof HTTPException) {
      return { ok: false, status: err.status, message: err.message };
    }
    throw err;
  }
  if (res.ok) return { ok: true };
  let message = "שגיאה בשמירת הראיון";
  try {
    const body = (await res.json()) as { message?: string };
    if (typeof body.message === "string" && body.message) message = body.message;
  } catch {
    /* non-JSON */
  }
  return { ok: false, status: res.status, message };
}

export function cookieOf(c: Context): string {
  return c.req.header("cookie") ?? "";
}
