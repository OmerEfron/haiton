import { Hono } from "hono";
import { closeDb, getDb } from "../db.ts";
import type { EditionSettings, Profile, User } from "../types.ts";
import { getSessionUserId } from "./session.ts";

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  initial: string;
  age: number | null;
  city: string | null;
  headline: string | null;
  publishing_since: string;
  edition_name: string;
  show_edition_tag: number;
  interview_reminder_at: string | null;
  stories_published: number;
  flashes: number;
  facts: number;
  drafts_in_progress: number;
  section_counts_json: string;
  archive_json: string;
}

function unauthorized(c: { json: (body: unknown, status: number) => Response }) {
  return c.json({ message: "צריך להיות מחובר" }, 401);
}

function rowToUser(row: ProfileRow): User {
  const user: User = {
    id: row.id,
    name: row.name,
    email: row.email,
    initial: row.initial,
  };
  if (row.age != null) user.age = row.age;
  if (row.city) user.city = row.city;
  if (row.headline) user.headline = row.headline;
  return user;
}

function loadProfile(userId: string): Profile | null {
  const row = getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.initial, u.age, u.city, u.headline, u.publishing_since,
              es.edition_name, es.show_edition_tag, es.interview_reminder_at,
              ps.stories_published, ps.flashes, ps.facts, ps.drafts_in_progress,
              pm.section_counts_json, pm.archive_json
       FROM users u
       JOIN edition_settings es ON es.user_id = u.id
       JOIN profile_stats ps ON ps.user_id = u.id
       JOIN profile_meta pm ON pm.user_id = u.id
       WHERE u.id = ?`,
    )
    .get(userId) as ProfileRow | undefined;
  if (!row) return null;

  return {
    user: rowToUser(row),
    publishingSince: row.publishing_since,
    settings: {
      editionName: row.edition_name,
      showEditionTag: row.show_edition_tag !== 0,
      interviewReminderAt: row.interview_reminder_at,
    },
    stats: {
      storiesPublished: row.stories_published,
      flashes: row.flashes,
      facts: row.facts,
      draftsInProgress: row.drafts_in_progress,
    },
    sectionCounts: JSON.parse(row.section_counts_json) as Profile["sectionCounts"],
    archive: JSON.parse(row.archive_json) as string[],
  };
}

export const profileRouter = new Hono()
  .get("/profile", (c) => {
    const userId = getSessionUserId(c);
    if (!userId) return unauthorized(c);

    const profile = loadProfile(userId);
    if (!profile) return c.json({ message: "הפרופיל לא נמצא" }, 404);
    return c.json(profile);
  })
  .patch("/profile/edition-settings", async (c) => {
    const userId = getSessionUserId(c);
    if (!userId) return unauthorized(c);

    const body = (await c.req.json()) as Partial<EditionSettings>;
    const db = getDb();

    const existing = db
      .prepare(
        `SELECT edition_name, show_edition_tag, interview_reminder_at
         FROM edition_settings WHERE user_id = ?`,
      )
      .get(userId) as
      | {
          edition_name: string;
          show_edition_tag: number;
          interview_reminder_at: string | null;
        }
      | undefined;

    if (!existing) return c.json({ message: "הפרופיל לא נמצא" }, 404);

    const editionName =
      body.editionName !== undefined ? body.editionName.trim() : existing.edition_name;
    const showEditionTag =
      body.showEditionTag !== undefined
        ? body.showEditionTag
          ? 1
          : 0
        : existing.show_edition_tag;
    const interviewReminderAt =
      body.interviewReminderAt !== undefined
        ? body.interviewReminderAt
        : existing.interview_reminder_at;

    db.prepare(
      `UPDATE edition_settings
       SET edition_name = ?, show_edition_tag = ?, interview_reminder_at = ?
       WHERE user_id = ?`,
    ).run(editionName, showEditionTag, interviewReminderAt, userId);

    const settings: EditionSettings = {
      editionName,
      showEditionTag: showEditionTag !== 0,
      interviewReminderAt,
    };
    return c.json(settings);
  });

/** Test helper — reset shared db between cases. */
export function resetProfileDb(): void {
  closeDb();
}
