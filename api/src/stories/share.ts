import { areConnected } from "../circle/graph.ts";
import { getDb } from "../db.ts";
import type { SharedStory, StoryBlock } from "../types.ts";
import { rowToStory, type StoryRow } from "./mappers.ts";

interface StoryJoinRow extends StoryRow {
  author_name: string;
  author_initial: string;
}

function teaserBody(body: StoryBlock[]): StoryBlock[] {
  const para = body.find((block) => block.kind === "paragraph");
  return para ? [para] : [];
}

export function loadSharedStory(token: string, viewerId: string | null): SharedStory | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.*, u.name AS author_name, u.initial AS author_initial
       FROM stories s JOIN users u ON u.id = s.user_id
       WHERE s.share_token = ?`,
    )
    .get(token) as StoryJoinRow | undefined;
  if (!row) return null;

  const author = { id: row.user_id, name: row.author_name, initial: row.author_initial };
  const isAuthor = viewerId === row.user_id;
  const connected = Boolean(viewerId) && areConnected(db, viewerId as string, row.user_id);
  const full = isAuthor || connected;

  let pending = false;
  let invitationId: string | undefined;
  if (viewerId && !full) {
    const inv = db
      .prepare(`SELECT id FROM invitations WHERE user_id = ? AND from_user_id = ?`)
      .get(viewerId, row.user_id) as { id: string } | undefined;
    if (inv) {
      pending = true;
      invitationId = inv.id;
    }
  }

  const viewerEdition = viewerId
    ? (
        db
          .prepare("SELECT edition_name FROM edition_settings WHERE user_id = ?")
          .get(viewerId) as { edition_name: string } | undefined
      )?.edition_name ?? ""
    : "";

  const story = rowToStory(row, viewerEdition, { author, gated: !full });
  if (!full) story.body = teaserBody(story.body);

  const shared: SharedStory = {
    ...story,
    gated: !full,
    connected,
    pending,
  };
  if (invitationId) shared.invitationId = invitationId;
  return shared;
}
