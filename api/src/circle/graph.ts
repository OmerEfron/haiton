import type { DatabaseSync } from "node:sqlite";
import { SECTION_NAMES } from "./constants.ts";
import { nextId } from "./rows.ts";

export type Person = { id: string; name: string; initial: string };

export function newToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function areConnected(db: DatabaseSync, a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  const ab = db
    .prepare(
      `SELECT 1 AS ok FROM connections
       WHERE user_id = ? AND connected_user_id = ? AND status = 'connected'`,
    )
    .get(a, b);
  const ba = db
    .prepare(
      `SELECT 1 AS ok FROM connections
       WHERE user_id = ? AND connected_user_id = ? AND status = 'connected'`,
    )
    .get(b, a);
  return Boolean(ab) && Boolean(ba);
}

export function resolveInviter(db: DatabaseSync, token: string): Person | null {
  const byInvite = db
    .prepare(`SELECT id, name, initial FROM users WHERE invite_token = ?`)
    .get(token) as Person | undefined;
  if (byInvite) return byInvite;
  const byShare = db
    .prepare(
      `SELECT u.id, u.name, u.initial FROM stories s
       JOIN users u ON u.id = s.user_id WHERE s.share_token = ?`,
    )
    .get(token) as Person | undefined;
  return byShare ?? null;
}

export function insertConnectionPair(db: DatabaseSync, userA: string, userB: string): void {
  if (userA === userB || areConnected(db, userA, userB)) return;
  const a = db
    .prepare(`SELECT id, name, initial FROM users WHERE id = ?`)
    .get(userA) as Person | undefined;
  const b = db
    .prepare(`SELECT id, name, initial FROM users WHERE id = ?`)
    .get(userB) as Person | undefined;
  if (!a || !b) return;
  insertOne(db, a, b);
  insertOne(db, b, a);
}

export function deleteConnectionPair(
  db: DatabaseSync,
  userId: string,
  connectionId: string,
): boolean {
  const row = db
    .prepare(`SELECT connected_user_id FROM connections WHERE user_id = ? AND id = ?`)
    .get(userId, connectionId) as { connected_user_id: string | null } | undefined;
  if (!row) return false;
  db.prepare(`DELETE FROM connections WHERE user_id = ? AND id = ?`).run(userId, connectionId);
  if (row.connected_user_id) {
    db.prepare(`DELETE FROM connections WHERE user_id = ? AND connected_user_id = ?`).run(
      row.connected_user_id,
      userId,
    );
  }
  return true;
}

export function bumpAuthorPublish(
  db: DatabaseSync,
  authorId: string,
  publishedAt: string,
): void {
  db.prepare(
    `UPDATE connections SET story_count = story_count + 1, last_published = ?
     WHERE connected_user_id = ? AND status = 'connected'`,
  ).run(publishedAt, authorId);
}

export function connectedUserIds(db: DatabaseSync, userId: string): string[] {
  const rows = db
    .prepare(
      `SELECT connected_user_id AS id FROM connections
       WHERE user_id = ? AND status = 'connected' AND connected_user_id IS NOT NULL`,
    )
    .all(userId) as { id: string }[];
  return rows.map((row) => row.id);
}

function insertOne(db: DatabaseSync, owner: Person, other: Person): void {
  const stats = db
    .prepare(`SELECT stories_published AS n FROM profile_stats WHERE user_id = ?`)
    .get(other.id) as { n: number } | undefined;
  try {
    db.prepare(
      `INSERT INTO connections
       (id, user_id, connected_user_id, name, initial, relation_label, relation,
        section, section_name, status, story_count, settings_json)
       VALUES (?, ?, ?, ?, ?, 'חדש במעגל', 'friend', 'friends', ?, 'connected', ?, '{}')`,
    ).run(
      nextId("c"),
      owner.id,
      other.id,
      other.name,
      other.initial,
      SECTION_NAMES.friends,
      stats?.n ?? 0,
    );
  } catch {
    /* unique pair already present */
  }
}
