import type { DatabaseSync } from "node:sqlite";
import { areConnected, connectedUserIds } from "../circle/graph.ts";
import { getDb } from "../db.ts";
import { provisionUser } from "../provision.ts";
import type { FrontPage, Story } from "../types.ts";
import { rowToFlash, rowToStory, type FlashRow, type StoryRow } from "./mappers.ts";

export const EDITION_NOT_FOUND = "המהדורה לא נמצאה";

interface StoryJoinRow extends StoryRow {
  author_name: string;
  author_initial: string;
}

interface PageState {
  edition_number: number;
  date_long: string;
  date_short: string;
  ticker_json: string;
  digests_json: string;
  open_draft_title: string | null;
  open_draft_summary: string | null;
}

export function dbForUser(userId: string): DatabaseSync {
  const db = getDb();
  const settings = db
    .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
    .get(userId) as { edition_name: string } | undefined;
  provisionUser(db, userId, settings?.edition_name ?? "");
  return db;
}

function loadStories(
  db: DatabaseSync,
  userIds: string[],
  viewerEditionName: string,
  newestFirst: boolean,
): Story[] {
  const ph = userIds.map(() => "?").join(",");
  const order = newestFirst
    ? "ORDER BY s.created_at DESC"
    : "ORDER BY s.placement = 'lead' DESC, s.placement = 'secondary' DESC, s.id";
  const rows = db
    .prepare(
      `SELECT s.*, u.name AS author_name, u.initial AS author_initial
       FROM stories s JOIN users u ON u.id = s.user_id
       WHERE s.user_id IN (${ph}) ${order}`,
    )
    .all(...userIds) as StoryJoinRow[];
  return rows.map((row) =>
    rowToStory(row, viewerEditionName, {
      author: { id: row.user_id, name: row.author_name, initial: row.author_initial },
    }),
  );
}

function loadFlashes(db: DatabaseSync, userIds: string[]) {
  const ph = userIds.map(() => "?").join(",");
  return (
    db
      .prepare(
        `SELECT f.id, f.time, f.text, f.story_id, s.share_token FROM flashes f
         LEFT JOIN stories s ON s.user_id = f.user_id AND s.id = f.story_id
         WHERE f.user_id IN (${ph}) ORDER BY f.rowid DESC`,
      )
      .all(...userIds) as FlashRow[]
  ).map(rowToFlash);
}

function loadShell(db: DatabaseSync, userId: string) {
  const settings = db
    .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
    .get(userId) as { edition_name: string } | undefined;
  const state = db
    .prepare(
      `SELECT edition_number, date_long, date_short, ticker_json, digests_json,
              open_draft_title, open_draft_summary
       FROM edition_state WHERE user_id = ?`,
    )
    .get(userId) as PageState | undefined;
  return { settings, state };
}

function pageFrom(
  settings: { edition_name: string },
  state: PageState,
  slots: Pick<FrontPage, "lead" | "secondary" | "list">,
  flashes: FrontPage["flashes"],
  openDraft: FrontPage["openDraft"],
): FrontPage {
  return {
    editionNumber: state.edition_number,
    dateLong: state.date_long,
    dateShort: state.date_short,
    editionName: settings.edition_name,
    ticker: JSON.parse(state.ticker_json) as string[],
    ...slots,
    flashes,
    digests: JSON.parse(state.digests_json) as FrontPage["digests"],
    openDraft,
  };
}

export function loadMixedEdition(userId: string): FrontPage {
  const db = dbForUser(userId);
  const { settings, state } = loadShell(db, userId);
  if (!settings || !state) {
    return {
      editionNumber: 1,
      dateLong: "",
      dateShort: "",
      editionName: "",
      ticker: [],
      lead: null,
      secondary: [],
      list: [],
      flashes: [],
      digests: [],
      openDraft: null,
    };
  }
  const ids = [userId, ...connectedUserIds(db, userId)];
  const stories = loadStories(db, ids, settings.edition_name, true);
  const openDraft =
    state.open_draft_title != null
      ? { title: state.open_draft_title, summary: state.open_draft_summary ?? "" }
      : null;
  return pageFrom(
    settings,
    state,
    {
      lead: stories[0] ? { ...stories[0], placement: "lead" } : null,
      secondary: stories.slice(1, 4).map((s) => ({ ...s, placement: "secondary" as const })),
      list: stories.slice(4).map((s) => ({ ...s, placement: "list" as const })),
    },
    loadFlashes(db, ids),
    openDraft,
  );
}

export function loadUserEdition(viewerId: string, targetUserId: string): FrontPage | null {
  const db = dbForUser(viewerId);
  if (viewerId !== targetUserId && !areConnected(db, viewerId, targetUserId)) return null;
  const { settings, state } = loadShell(db, targetUserId);
  if (!settings || !state) return null;
  const viewerEdition =
    db
      .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
      .get(viewerId) as { edition_name: string } | undefined;
  const stories = loadStories(db, [targetUserId], viewerEdition?.edition_name ?? "", false);
  const openDraft =
    viewerId === targetUserId && state.open_draft_title != null
      ? { title: state.open_draft_title, summary: state.open_draft_summary ?? "" }
      : null;
  return pageFrom(
    settings,
    state,
    {
      lead: stories.find((s) => s.placement === "lead") ?? null,
      secondary: stories.filter((s) => s.placement === "secondary"),
      list: stories.filter((s) => s.placement === "list"),
    },
    loadFlashes(db, [targetUserId]),
    openDraft,
  );
}
