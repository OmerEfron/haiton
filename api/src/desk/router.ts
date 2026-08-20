import { Hono } from "hono";
import { ERROR_DAILY_QUOTA, ERROR_INTERVIEW_NOT_FOUND } from "../contract.ts";
import { balance, charge, isCreditKind } from "../credits.ts";
import { getDb } from "../db.ts";
import { israelDay } from "../quota.ts";
import { requireSession, type StoriesVariables } from "../stories/session.ts";
import type { InterviewListItem, InterviewSnapshot, Quota } from "../types.ts";
import { loadBrief } from "./brief.ts";

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

export function createDeskRouter(): Hono<{ Variables: StoriesVariables }> {
  const app = new Hono<{ Variables: StoriesVariables }>();
  app.use("/quota", requireSession);
  app.use("/desk/*", requireSession);

  app.get("/quota", (c) => {
    const quota: Quota = balance(c.get("userId"));
    return c.json(quota);
  });

  app.post("/desk/credits", async (c) => {
    const body = (await c.req.json()) as { kind?: unknown };
    if (!isCreditKind(body.kind)) {
      return c.json({ message: "סוג חיוב לא תקין" }, 400);
    }
    const result = charge(c.get("userId"), body.kind);
    if (!result.ok) {
      c.header("Retry-After", String(result.retryAfter));
      return c.json({ message: ERROR_DAILY_QUOTA, resetsAt: result.resetsAt }, 429);
    }
    return c.json(result.quota);
  });

  app.get("/desk/brief", (c) => {
    const brief = loadBrief(getDb(), c.get("userId"));
    if (!brief) return c.json({ message: "הפרופיל לא נמצא" }, 404);
    return c.json(brief);
  });

  app.get("/desk/interviews", (c) => {
    const rows = getDb()
      .prepare(
        `SELECT id, started_at, headline, session_json
         FROM interviews WHERE user_id = ? ORDER BY started_at DESC`,
      )
      .all(c.get("userId")) as unknown as InterviewRow[];

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
    const json = JSON.stringify(body);
    const headline = headlineFrom(body);

    if (!existing) {
      db.prepare(
        `INSERT INTO interviews (id, user_id, day, started_at, headline, session_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, israelDay(), body.startedAt, headline, json);
    } else {
      db.prepare(
        "UPDATE interviews SET headline = ?, session_json = ? WHERE user_id = ? AND id = ?",
      ).run(headline, json, userId, id);
    }

    return c.json(balance(userId));
  });

  return app;
}
