import { Hono } from "hono";
import { getDb } from "../db.ts";
import type { Fact, FactCategory } from "../types.ts";
import { getSessionUserId } from "./session.ts";

const CATEGORIES = new Set<FactCategory>(["personal", "work", "family", "routine"]);

interface FactRow {
  id: string;
  category: FactCategory;
  text: string;
  used_in_stories: number;
  updated_label: string | null;
}

function rowToFact(row: FactRow): Fact {
  const fact: Fact = {
    id: row.id,
    category: row.category,
    text: row.text,
    usedInStories: row.used_in_stories,
  };
  if (row.updated_label) fact.updatedLabel = row.updated_label;
  return fact;
}

function nextFactId(): string {
  return `k_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function unauthorized(c: { json: (body: unknown, status: number) => Response }) {
  return c.json({ message: "צריך להיות מחובר" }, 401);
}

export const kartesetRouter = new Hono();

kartesetRouter.get("/karteset/facts", (c) => {
  const userId = getSessionUserId(c);
  if (!userId) return unauthorized(c);

  const rows = getDb()
    .prepare(
      `SELECT id, category, text, used_in_stories, updated_label
       FROM facts WHERE user_id = ? ORDER BY rowid DESC`,
    )
    .all(userId) as FactRow[];

  return c.json(rows.map(rowToFact));
});

kartesetRouter.post("/karteset/facts", async (c) => {
  const userId = getSessionUserId(c);
  if (!userId) return unauthorized(c);

  const body = (await c.req.json()) as { text?: string; category?: string };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return c.json({ message: "אי אפשר לרשום עובדה ריקה" }, 400);

  const category = body.category as FactCategory;
  if (!CATEGORIES.has(category)) {
    return c.json({ message: "קטגוריה לא תקינה" }, 400);
  }

  const id = nextFactId();
  const updatedLabel = "נרשם עכשיו";
  const db = getDb();

  db.prepare(
    `INSERT INTO facts (id, user_id, category, text, used_in_stories, updated_label)
     VALUES (?, ?, ?, ?, 0, ?)`,
  ).run(id, userId, category, text, updatedLabel);

  db.prepare(`UPDATE profile_stats SET facts = facts + 1 WHERE user_id = ?`).run(userId);

  return c.json({
    id,
    category,
    text,
    usedInStories: 0,
    updatedLabel,
  } satisfies Fact);
});

kartesetRouter.patch("/karteset/facts/:id", async (c) => {
  const userId = getSessionUserId(c);
  if (!userId) return unauthorized(c);

  const id = c.req.param("id");
  const body = (await c.req.json()) as { text?: string; category?: string };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return c.json({ message: "אי אפשר לרשום עובדה ריקה" }, 400);

  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM facts WHERE user_id = ? AND id = ?`)
    .get(userId, id) as { id: string } | undefined;

  if (!existing) return c.json({ message: "העובדה לא נמצאה בכרטסת" }, 404);

  const category =
    body.category && CATEGORIES.has(body.category as FactCategory)
      ? (body.category as FactCategory)
      : undefined;

  const updatedLabel = "עודכן עכשיו";

  if (category) {
    db.prepare(
      `UPDATE facts SET text = ?, category = ?, updated_label = ? WHERE user_id = ? AND id = ?`,
    ).run(text, category, updatedLabel, userId, id);
  } else {
    db.prepare(
      `UPDATE facts SET text = ?, updated_label = ? WHERE user_id = ? AND id = ?`,
    ).run(text, updatedLabel, userId, id);
  }

  const row = db
    .prepare(
      `SELECT id, category, text, used_in_stories, updated_label
       FROM facts WHERE user_id = ? AND id = ?`,
    )
    .get(userId, id) as FactRow;

  return c.json(rowToFact(row));
});

kartesetRouter.delete("/karteset/facts/:id", (c) => {
  const userId = getSessionUserId(c);
  if (!userId) return unauthorized(c);

  const id = c.req.param("id");
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM facts WHERE user_id = ? AND id = ?`)
    .run(userId, id);

  if (result.changes === 0) {
    return c.json({ message: "העובדה לא נמצאה בכרטסת" }, 404);
  }

  db.prepare(
    `UPDATE profile_stats SET facts = MAX(0, facts - 1) WHERE user_id = ?`,
  ).run(userId);

  return c.body(null, 204);
});
