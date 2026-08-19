import { Hono } from "hono";
import { ERROR_DAILY_QUOTA } from "../contract.ts";
import { getDb } from "../db.ts";
import { provisionUser } from "../provision.ts";
import { countToday, nextResetIso, secondsUntilIsraelMidnight } from "../quota.ts";
import type { Draft, FrontPage } from "../types.ts";
import {
  DRAFT_NOT_READY,
  STORY_NOT_FOUND,
  rowToFlash,
  rowToStory,
  type FlashRow,
  type StoryRow,
} from "./mappers.ts";
import { publishDraft } from "./publish.ts";
import { requireSession, type StoriesVariables } from "./session.ts";

function dbForUser(userId: string) {
  const db = getDb();
  const settings = db
    .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
    .get(userId) as { edition_name: string } | undefined;
  provisionUser(db, userId, settings?.edition_name ?? "");
  return db;
}

export function createStoriesRouter(): Hono<{ Variables: StoriesVariables }> {
  const app = new Hono<{ Variables: StoriesVariables }>();
  app.use("*", requireSession);

  app.get("/editions/current", (c) => {
    const userId = c.get("userId");
    const db = dbForUser(userId);

    const settings = db
      .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
      .get(userId) as { edition_name: string };
    const state = db
      .prepare(
        `SELECT edition_number, date_long, date_short, ticker_json, digests_json,
                open_draft_title, open_draft_summary
         FROM edition_state WHERE user_id = ?`,
      )
      .get(userId) as {
      edition_number: number;
      date_long: string;
      date_short: string;
      ticker_json: string;
      digests_json: string;
      open_draft_title: string | null;
      open_draft_summary: string | null;
    };
    const stories = db
      .prepare("SELECT * FROM stories WHERE user_id = ?")
      .all(userId) as StoryRow[];
    const mapped = stories.map((row) => rowToStory(row, settings.edition_name));

    const flashes = (
      db
        .prepare(
          "SELECT id, time, text, story_id FROM flashes WHERE user_id = ? ORDER BY sort_order",
        )
        .all(userId) as FlashRow[]
    ).map(rowToFlash);

    const openDraft =
      state.open_draft_title != null
        ? {
            title: state.open_draft_title,
            summary: state.open_draft_summary ?? "",
          }
        : null;

    const page: FrontPage = {
      editionNumber: state.edition_number,
      dateLong: state.date_long,
      dateShort: state.date_short,
      editionName: settings.edition_name,
      ticker: JSON.parse(state.ticker_json) as string[],
      lead: mapped.find((s) => s.placement === "lead") ?? null,
      secondary: mapped.filter((s) => s.placement === "secondary"),
      list: mapped.filter((s) => s.placement === "list"),
      flashes,
      digests: JSON.parse(state.digests_json) as FrontPage["digests"],
      openDraft,
    };

    return c.json(page);
  });

  app.get("/flashes", (c) => {
    const userId = c.get("userId");
    const db = dbForUser(userId);
    const state = db
      .prepare("SELECT date_short FROM edition_state WHERE user_id = ?")
      .get(userId) as { date_short: string } | undefined;
    const flashes = (
      db
        .prepare(
          "SELECT id, time, text, story_id FROM flashes WHERE user_id = ? ORDER BY sort_order",
        )
        .all(userId) as FlashRow[]
    ).map(rowToFlash);

    return c.json({ flashes, dateShort: state?.date_short ?? "" });
  });

  app.get("/stories", (c) => {
    const userId = c.get("userId");
    const section = c.req.query("section");
    const db = dbForUser(userId);
    const settings = db
      .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
      .get(userId) as { edition_name: string };

    const rows = section
      ? (db
          .prepare("SELECT * FROM stories WHERE user_id = ? AND section = ?")
          .all(userId, section) as StoryRow[])
      : (db.prepare("SELECT * FROM stories WHERE user_id = ?").all(userId) as StoryRow[]);

    return c.json(rows.map((row) => rowToStory(row, settings.edition_name)));
  });

  app.get("/stories/:id", (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const db = dbForUser(userId);
    const settings = db
      .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
      .get(userId) as { edition_name: string };
    const row = db
      .prepare("SELECT * FROM stories WHERE user_id = ? AND id = ?")
      .get(userId, id) as StoryRow | undefined;

    if (!row) return c.json({ message: STORY_NOT_FOUND }, 404);
    return c.json(rowToStory(row, settings.edition_name));
  });

  app.post("/stories", async (c) => {
    const draft = (await c.req.json()) as Draft;
    if (draft.status !== "ready" || !draft.headline) {
      return c.json({ message: DRAFT_NOT_READY }, 400);
    }

    const userId = c.get("userId");
    const created = (
      getDb()
        .prepare("SELECT created_at FROM stories WHERE user_id = ?")
        .all(userId) as { created_at: string | null }[]
    ).map((row) => row.created_at);
    if (countToday(created) >= 2) {
      c.header("Retry-After", String(secondsUntilIsraelMidnight()));
      return c.json({ message: ERROR_DAILY_QUOTA, resetsAt: nextResetIso() }, 429);
    }

    const story = publishDraft(getDb(), userId, draft);
    return c.json(story, 201);
  });

  return app;
}
