import { Hono } from "hono";
import { DAILY_STORY_LIMIT, ERROR_DAILY_QUOTA } from "../contract.ts";
import { getDb } from "../db.ts";
import { countToday, nextResetIso, secondsUntilIsraelMidnight } from "../quota.ts";
import type { Draft } from "../types.ts";
import { dbForUser, EDITION_NOT_FOUND, loadMixedEdition, loadUserEdition } from "./edition.ts";
import { DRAFT_NOT_READY, STORY_NOT_FOUND, rowToFlash, rowToStory, type FlashRow, type StoryRow } from "./mappers.ts";
import { deleteStory, updateStory } from "./mutate.ts";
import { publishDraft } from "./publish.ts";
import { optionalSession, requireSession, type StoriesVariables } from "./session.ts";
import { loadSharedStory } from "./share.ts";

export function createStoriesRouter(): Hono<{ Variables: StoriesVariables }> {
  const app = new Hono<{ Variables: StoriesVariables }>();

  app.get("/stories/share/:token", optionalSession, (c) => {
    const token = c.req.param("token");
    if (!token) return c.json({ message: STORY_NOT_FOUND }, 404);
    const shared = loadSharedStory(token, c.get("userId") || null);
    if (!shared) return c.json({ message: STORY_NOT_FOUND }, 404);
    return c.json(shared);
  });

  // Scoped so public routes on sibling routers (invite preview) are not 401'd.
  app.use("/editions/*", requireSession);
  app.use("/flashes", requireSession);
  app.use("/stories", requireSession);
  app.use("/stories/*", requireSession);

  app.get("/editions/current", (c) => c.json(loadMixedEdition(c.get("userId"))));

  app.get("/editions/:userId", (c) => {
    const page = loadUserEdition(c.get("userId"), c.req.param("userId"));
    if (!page) return c.json({ message: EDITION_NOT_FOUND }, 404);
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
          `SELECT f.id, f.time, f.text, f.story_id, s.share_token FROM flashes f
           LEFT JOIN stories s ON s.user_id = f.user_id AND s.id = f.story_id
           WHERE f.user_id = ? AND COALESCE(s.hidden, 0) = 0 ORDER BY f.sort_order`,
        )
        .all(userId) as unknown as FlashRow[]
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
    const author = db
      .prepare("SELECT id, name, initial FROM users WHERE id = ?")
      .get(userId) as { id: string; name: string; initial: string };

    const rows = section
      ? (db
          .prepare("SELECT * FROM stories WHERE user_id = ? AND section = ?")
          .all(userId, section) as unknown as StoryRow[])
      : (db.prepare("SELECT * FROM stories WHERE user_id = ?").all(userId) as unknown as StoryRow[]);

    return c.json(rows.map((row) => rowToStory(row, settings.edition_name, { author })));
  });

  app.get("/stories/:id", (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const db = dbForUser(userId);
    const settings = db
      .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
      .get(userId) as { edition_name: string };
    const author = db
      .prepare("SELECT id, name, initial FROM users WHERE id = ?")
      .get(userId) as { id: string; name: string; initial: string };
    const row = db
      .prepare("SELECT * FROM stories WHERE user_id = ? AND id = ?")
      .get(userId, id) as StoryRow | undefined;

    if (!row) return c.json({ message: STORY_NOT_FOUND }, 404);
    return c.json(rowToStory(row, settings.edition_name, { author }));
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
    if (countToday(created) >= DAILY_STORY_LIMIT) {
      c.header("Retry-After", String(secondsUntilIsraelMidnight()));
      return c.json({ message: ERROR_DAILY_QUOTA, resetsAt: nextResetIso() }, 429);
    }

    const story = publishDraft(getDb(), userId, draft);
    return c.json(story, 201);
  });

  app.patch("/stories/:id", async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const patch = (await c.req.json()) as {
      headline?: string;
      standfirst?: string;
      body?: string[];
      hidden?: boolean;
    };
    const story = updateStory(getDb(), userId, id, patch);
    if (!story) return c.json({ message: STORY_NOT_FOUND }, 404);
    return c.json(story);
  });

  app.delete("/stories/:id", (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    if (!deleteStory(getDb(), userId, id)) return c.json({ message: STORY_NOT_FOUND }, 404);
    return c.body(null, 204);
  });

  return app;
}
