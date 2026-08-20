import type { DatabaseSync } from "node:sqlite";
import { bumpAuthorPublish, newToken } from "../circle/graph.ts";
import type { Draft, FrontPage, SectionId, Story } from "../types.ts";
import {
  BYLINE,
  MAIN_SECTION,
  MAIN_SECTION_NAME,
  SECTION_NAMES,
  angleFromDraft,
  nowPublishedAt,
  paragraphsToBody,
  rowToStory,
  type StoryRow,
} from "./mappers.ts";

const SECTION_ORDER: SectionId[] = [
  "work",
  "family",
  "friends",
  "celebrations",
  "food",
  "moments",
  "flashes",
];

function rebuildDigestsJson(db: DatabaseSync, userId: string): string {
  const rows = db
    .prepare(
      "SELECT id, section, section_name, headline FROM stories WHERE user_id = ? ORDER BY section, CAST(id AS INTEGER)",
    )
    .all(userId) as { id: string; section: string; section_name: string; headline: string }[];

  const bySection = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = bySection.get(row.section) ?? [];
    list.push(row);
    bySection.set(row.section, list);
  }

  const digests: FrontPage["digests"] = SECTION_ORDER.filter((section) =>
    bySection.has(section),
  ).map((section) => {
    const items = bySection.get(section)!;
    return {
      section,
      name: items[0]?.section_name ?? SECTION_NAMES[section],
      items: items.map((row) => ({ id: row.id, headline: row.headline })),
    };
  });

  return JSON.stringify(digests);
}

function rebuildSectionCountsJson(db: DatabaseSync, userId: string): string {
  const rows = db
    .prepare(
      "SELECT section, section_name, COUNT(*) AS cnt FROM stories WHERE user_id = ? GROUP BY section",
    )
    .all(userId) as { section: string; section_name: string; cnt: number }[];

  if (rows.length === 0) return "[]";

  const maxCount = Math.max(...rows.map((row) => row.cnt));
  const counts = [...rows]
    .sort(
      (a, b) =>
        SECTION_ORDER.indexOf(a.section as SectionId) -
        SECTION_ORDER.indexOf(b.section as SectionId),
    )
    .map((row) => ({
      label: row.section_name,
      detail:
        row.cnt === maxCount
          ? `${row.cnt} ידיעות · מדור ראשי`
          : `${row.cnt} ידיעות`,
    }));

  return JSON.stringify(counts);
}

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
  const body = paragraphsToBody(draft.paragraphs);
  const shareToken = newToken();
  const author = db
    .prepare(`SELECT id, name, initial FROM users WHERE id = ?`)
    .get(userId) as { id: string; name: string; initial: string };

  db.prepare(
    "UPDATE stories SET placement = 'secondary' WHERE user_id = ? AND placement = 'lead'",
  ).run(userId);

  db.prepare(
    `INSERT INTO stories (
      id, user_id, section, section_name, edition_label, headline, standfirst,
      body_json, angle, byline, published_at, image_caption, placement, created_at, share_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lead', ?, ?)`,
  ).run(
    storyId,
    userId,
    MAIN_SECTION,
    MAIN_SECTION_NAME,
    settings.edition_name,
    draft.headline,
    draft.standfirst ?? "",
    JSON.stringify(body),
    angleFromDraft(draft),
    BYLINE,
    full,
    null,
    new Date().toISOString(),
    shareToken,
  );

  const flashId = `f_${Date.now()}`;
  const flashOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM flashes WHERE user_id = ?")
    .get(userId) as { next: number };

  db.prepare(
    "INSERT INTO flashes (id, user_id, time, text, story_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(flashId, userId, time, draft.headline, storyId, flashOrder.next);

  const ticker = [
    `${draft.headline}`,
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

  db.prepare(
    "UPDATE edition_state SET digests_json = ? WHERE user_id = ?",
  ).run(rebuildDigestsJson(db, userId), userId);

  db.prepare(
    `INSERT OR IGNORE INTO profile_meta (user_id, section_counts_json, archive_json)
     VALUES (?, '[]', '[]')`,
  ).run(userId);
  db.prepare(
    "UPDATE profile_meta SET section_counts_json = ? WHERE user_id = ?",
  ).run(rebuildSectionCountsJson(db, userId), userId);

  bumpAuthorPublish(db, userId, full);

  const row = db
    .prepare("SELECT * FROM stories WHERE user_id = ? AND id = ?")
    .get(userId, storyId) as StoryRow;

  return rowToStory(row, settings.edition_name, { author });
}
