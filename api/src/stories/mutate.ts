import type { DatabaseSync } from "node:sqlite";
import type { Story } from "../types.ts";
import { paragraphsToBody, rowToStory, type StoryRow } from "./mappers.ts";
import {
  rebuildDigestsJson,
  rebuildSectionCountsJson,
  rebuildTickerJson,
} from "./publish.ts";

export interface StoryPatch {
  headline?: string;
  standfirst?: string;
  body?: string[];
  hidden?: boolean;
}

function loadMapped(db: DatabaseSync, userId: string, id: string): Story | null {
  const settings = db
    .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
    .get(userId) as { edition_name: string } | undefined;
  const author = db
    .prepare("SELECT id, name, initial FROM users WHERE id = ?")
    .get(userId) as { id: string; name: string; initial: string } | undefined;
  const row = db
    .prepare("SELECT * FROM stories WHERE user_id = ? AND id = ?")
    .get(userId, id) as StoryRow | undefined;
  if (!settings || !author || !row) return null;
  return rowToStory(row, settings.edition_name, { author });
}

function persistLists(db: DatabaseSync, userId: string, sections: boolean): void {
  db.prepare("UPDATE edition_state SET ticker_json = ?, digests_json = ? WHERE user_id = ?").run(
    rebuildTickerJson(db, userId),
    rebuildDigestsJson(db, userId),
    userId,
  );
  if (!sections) return;
  db.prepare("UPDATE profile_meta SET section_counts_json = ? WHERE user_id = ?").run(
    rebuildSectionCountsJson(db, userId),
    userId,
  );
}

function promoteNewestVisibleLead(db: DatabaseSync, userId: string): void {
  const hasLead = db
    .prepare(
      `SELECT id FROM stories
       WHERE user_id = ? AND placement = 'lead' AND COALESCE(hidden, 0) = 0`,
    )
    .get(userId);
  if (hasLead) return;
  const next = db
    .prepare(
      `SELECT id FROM stories WHERE user_id = ? AND COALESCE(hidden, 0) = 0
       ORDER BY created_at DESC, CAST(id AS INTEGER) DESC LIMIT 1`,
    )
    .get(userId) as { id: string } | undefined;
  if (!next) return;
  db.prepare("UPDATE stories SET placement = 'lead' WHERE user_id = ? AND id = ?").run(
    userId,
    next.id,
  );
}

export function updateStory(
  db: DatabaseSync,
  userId: string,
  id: string,
  patch: StoryPatch,
): Story | null {
  const row = db
    .prepare("SELECT * FROM stories WHERE user_id = ? AND id = ?")
    .get(userId, id) as StoryRow | undefined;
  if (!row) return null;

  const headline = typeof patch.headline === "string" ? patch.headline.trim() : "";
  let lists = false;

  if (headline) {
    db.prepare("UPDATE stories SET headline = ? WHERE user_id = ? AND id = ?").run(
      headline,
      userId,
      id,
    );
    db.prepare("UPDATE flashes SET text = ? WHERE user_id = ? AND story_id = ?").run(
      headline,
      userId,
      id,
    );
    lists = true;
  }
  if (typeof patch.standfirst === "string") {
    db.prepare("UPDATE stories SET standfirst = ? WHERE user_id = ? AND id = ?").run(
      patch.standfirst,
      userId,
      id,
    );
  }
  if (Array.isArray(patch.body) && patch.body.every((p) => typeof p === "string")) {
    db.prepare("UPDATE stories SET body_json = ? WHERE user_id = ? AND id = ?").run(
      JSON.stringify(paragraphsToBody(patch.body)),
      userId,
      id,
    );
  }

  if (patch.hidden === true && !row.hidden) {
    db.prepare("UPDATE stories SET hidden = 1 WHERE user_id = ? AND id = ?").run(userId, id);
    promoteNewestVisibleLead(db, userId);
    lists = true;
  } else if (patch.hidden === false && row.hidden) {
    const otherLead = db
      .prepare(
        `SELECT id FROM stories
         WHERE user_id = ? AND placement = 'lead' AND COALESCE(hidden, 0) = 0 AND id != ?`,
      )
      .get(userId, id);
    db.prepare("UPDATE stories SET hidden = 0, placement = ? WHERE user_id = ? AND id = ?").run(
      otherLead ? "list" : "lead",
      userId,
      id,
    );
    lists = true;
  }

  if (lists) persistLists(db, userId, false);
  return loadMapped(db, userId, id);
}

export function deleteStory(db: DatabaseSync, userId: string, id: string): boolean {
  const row = db
    .prepare("SELECT id FROM stories WHERE user_id = ? AND id = ?")
    .get(userId, id);
  if (!row) return false;

  const flashCount = (
    db
      .prepare("SELECT COUNT(*) AS n FROM flashes WHERE user_id = ? AND story_id = ?")
      .get(userId, id) as { n: number }
  ).n;

  db.prepare("DELETE FROM flashes WHERE user_id = ? AND story_id = ?").run(userId, id);
  db.prepare("DELETE FROM stories WHERE user_id = ? AND id = ?").run(userId, id);
  db.prepare(
    `UPDATE profile_stats SET
       stories_published = MAX(0, stories_published - 1),
       flashes = MAX(0, flashes - ?)
     WHERE user_id = ?`,
  ).run(flashCount, userId);

  promoteNewestVisibleLead(db, userId);
  persistLists(db, userId, true);
  return true;
}
