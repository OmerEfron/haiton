import { Hono } from "hono";
import {
  DAILY_INTERVIEW_LIMIT,
  ERROR_DAILY_QUOTA,
  ERROR_INTERVIEW_NOT_FOUND,
} from "../contract.ts";
import { getDb } from "../db.ts";
import { israelDay, nextResetIso, quotaPayload, secondsUntilIsraelMidnight } from "../quota.ts";
import { requireSession, type StoriesVariables } from "../stories/session.ts";
import type { InterviewListItem, InterviewSnapshot, Quota } from "../types.ts";

interface InterviewRow {
  id: string;
  started_at: string;
  headline: string | null;
  session_json: string;
}

function headlineFrom(session: InterviewSnapshot): string | null {
  if (session.draft?.headline) return session.draft.headline;
  const first = session.messages.find((m) => m.role === "reader");
  return first?.text ?? null;
}

function todayCount(userId: string, day: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM interviews WHERE user_id = ? AND day = ?")
    .get(userId, day) as { n: number };
  return row.n;
}

export function createDeskRouter(): Hono<{ Variables: StoriesVariables }> {
  const app = new Hono<{ Variables: StoriesVariables }>();
  app.use("*", requireSession);

  app.get("/quota", (c) => {
    const used = todayCount(c.get("userId"), israelDay());
    const quota: Quota = quotaPayload(used);
    return c.json(quota);
  });

  app.get("/desk/interviews", (c) => {
    const rows = getDb()
      .prepare(
        `SELECT id, started_at, headline, session_json
         FROM interviews WHERE user_id = ? ORDER BY started_at DESC`,
      )
      .all(c.get("userId")) as InterviewRow[];

    const list: InterviewListItem[] = rows.map((row) => {
      const session = JSON.parse(row.session_json) as InterviewSnapshot;
      return {
        id: row.id,
        startedAt: row.started_at,
        headline: row.headline,
        exhausted: Boolean(session.exhausted),
      };
    });
    return c.json(list);
  });

  app.get("/desk/interviews/:id", (c) => {
    const row = getDb()
      .prepare("SELECT session_json FROM interviews WHERE user_id = ? AND id = ?")
      .get(c.get("userId"), c.req.param("id")) as { session_json: string } | undefined;
    if (!row) return c.json({ message: ERROR_INTERVIEW_NOT_FOUND }, 404);
    return c.json(JSON.parse(row.session_json));
  });

  app.put("/desk/interviews/:id", async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    const body = (await c.req.json()) as InterviewSnapshot;
    if (!body || body.id !== id || typeof body.startedAt !== "string" || !Array.isArray(body.messages)) {
      return c.json({ message: "ראיון לא תקין" }, 400);
    }

    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM interviews WHERE user_id = ? AND id = ?")
      .get(userId, id) as { id: string } | undefined;
    const day = israelDay();
    const json = JSON.stringify(body);
    const headline = headlineFrom(body);

    if (!existing) {
      if (todayCount(userId, day) >= DAILY_INTERVIEW_LIMIT) {
        c.header("Retry-After", String(secondsUntilIsraelMidnight()));
        return c.json({ message: ERROR_DAILY_QUOTA, resetsAt: nextResetIso() }, 429);
      }
      db.prepare(
        `INSERT INTO interviews (id, user_id, day, started_at, headline, session_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, day, body.startedAt, headline, json);
    } else {
      db.prepare(
        "UPDATE interviews SET headline = ?, session_json = ? WHERE user_id = ? AND id = ?",
      ).run(headline, json, userId, id);
    }

    return c.json(quotaPayload(todayCount(userId, day)));
  });

  return app;
}
