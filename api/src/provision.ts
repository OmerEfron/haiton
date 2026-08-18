import type { DatabaseSync } from "node:sqlite";

/** Satellite rows every signed-in user needs. INSERT OR IGNORE so live DBs self-heal. */
export function provisionUser(
  db: DatabaseSync,
  userId: string,
  editionName: string,
): void {
  db.prepare(
    "INSERT OR IGNORE INTO edition_settings (user_id, edition_name) VALUES (?, ?)",
  ).run(userId, editionName);
  db.prepare(
    `INSERT OR IGNORE INTO profile_stats
       (user_id, stories_published, flashes, facts, drafts_in_progress)
     VALUES (?, 0, 0, 0, 0)`,
  ).run(userId);
  db.prepare(
    `INSERT OR IGNORE INTO profile_meta (user_id, section_counts_json, archive_json)
     VALUES (?, '[]', '[]')`,
  ).run(userId);
  db.prepare(
    `INSERT OR IGNORE INTO edition_state
       (user_id, edition_number, date_long, date_short, ticker_json, digests_json)
     VALUES (?, 1, '', '', '[]', '[]')`,
  ).run(userId);
}
