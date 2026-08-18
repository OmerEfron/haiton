import type { DatabaseSync } from "node:sqlite";
import type { Draft, Story } from "../types.ts";
import {
  BYLINE,
  angleFromDraft,
  nowPublishedAt,
  paragraphsToBody,
  rowToStory,
  sectionNameFor,
  type StoryRow,
} from "./mappers.ts";

export function nextStoryId(db: DatabaseSync, userId: string): string {
  const row = db
    .prepare(
      "SELECT MAX(CAST(id AS INTEGER)) AS max_id FROM stories WHERE user_id = ?",
    )
    .get(userId) as { max_id: number | null };
  return String((row.max_id ?? 0) + 1);
}

export function publishDraft(
  db: DatabaseSync,
  userId: string,
  draft: Draft,
): Story {
  const settings = db
    .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
    .get(userId) as { edition_name: string };
  const state = db
    .prepare(
      "SELECT edition_number, date_short, ticker_json FROM edition_state WHERE user_id = ?",
    )
    .get(userId) as {
    edition_number: number;
    date_short: string;
    ticker_json: string;
  };

  const { time, full } = nowPublishedAt(state.date_short);
  const storyId = nextStoryId(db, userId);
  const section = draft.section ?? "work";
  const body = paragraphsToBody(draft.paragraphs);

  db.prepare(
    "UPDATE stories SET placement = 'secondary' WHERE user_id = ? AND placement = 'lead'",
  ).run(userId);

  db.prepare(
    `INSERT INTO stories (
      id, user_id, section, section_name, edition_label, headline, standfirst,
      body_json, angle, byline, published_at, image_caption, placement
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lead')`,
  ).run(
    storyId,
    userId,
    section,
    sectionNameFor(section),
    settings.edition_name,
    draft.headline,
    draft.standfirst ?? "",
    JSON.stringify(body),
    angleFromDraft(draft),
    BYLINE,
    full,
    "placeholder",
  );

  const flashId = `f_${Date.now()}`;
  const flashOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM flashes WHERE user_id = ?")
    .get(userId) as { next: number };

  db.prepare(
    "INSERT INTO flashes (id, user_id, time, text, story_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(flashId, userId, time, draft.headline, storyId, flashOrder.next);

  const ticker = [
    `ידיעה חדשה פורסמה: ${draft.headline}`,
    ...(JSON.parse(state.ticker_json) as string[]),
  ].slice(0, 5);

  db.prepare(
    "UPDATE edition_state SET edition_number = edition_number + 1, ticker_json = ? WHERE user_id = ?",
  ).run(JSON.stringify(ticker), userId);

  db.prepare(
    `UPDATE profile_stats SET
      stories_published = stories_published + 1,
      flashes = flashes + 1,
      drafts_in_progress = 0
     WHERE user_id = ?`,
  ).run(userId);

  const row = db
    .prepare("SELECT * FROM stories WHERE user_id = ? AND id = ?")
    .get(userId, storyId) as StoryRow;

  return rowToStory(row, settings.edition_name);
}
