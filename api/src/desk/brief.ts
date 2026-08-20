import type { DatabaseSync } from "node:sqlite";
import type { Fact, FactCategory, PersonBrief } from "../types.ts";

const CIRCLE_CAP = 20;
const RECENT_CAP = 5;

interface FactRow {
  id: string;
  category: FactCategory;
  text: string;
  used_in_stories: number;
  updated_label: string | null;
}

function formatUpdatedLabel(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return raw;
  return new Date(ms).toLocaleString("he-IL");
}

function rowToFact(row: FactRow): Fact {
  const fact: Fact = {
    id: row.id,
    category: row.category,
    text: row.text,
    usedInStories: row.used_in_stories,
  };
  const updatedLabel = formatUpdatedLabel(row.updated_label);
  if (updatedLabel) fact.updatedLabel = updatedLabel;
  return fact;
}

export function loadBrief(db: DatabaseSync, userId: string): PersonBrief | null {
  const user = db
    .prepare("SELECT name, age, city, headline FROM users WHERE id = ?")
    .get(userId) as
    | { name: string; age: number | null; city: string | null; headline: string | null }
    | undefined;
  if (!user) return null;

  const subject: PersonBrief["subject"] = { name: user.name };
  if (user.city) subject.city = user.city;
  if (user.age != null) subject.age = user.age;
  if (user.headline) subject.headline = user.headline;

  const facts = (
    db
      .prepare(
        `SELECT id, category, text, used_in_stories, updated_label
         FROM facts WHERE user_id = ? ORDER BY rowid DESC`,
      )
      .all(userId) as FactRow[]
  ).map(rowToFact);

  const circle = db
    .prepare(
      `SELECT u.name, c.relation_label AS relationLabel, c.section_name AS sectionName
       FROM connections c
       JOIN users u ON u.id = c.connected_user_id
       WHERE c.user_id = ? AND c.status = 'connected'
       LIMIT ?`,
    )
    .all(userId, CIRCLE_CAP) as PersonBrief["circle"];

  const recent = db
    .prepare(
      `SELECT headline, angle FROM stories
       WHERE user_id = ? AND COALESCE(hidden, 0) = 0
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, RECENT_CAP) as PersonBrief["recent"];

  return { subject, facts, circle, recent };
}
