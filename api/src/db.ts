import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_DATABASE_PATH = join(__dirname, "..", "data", "iton.sqlite");

let db: DatabaseSync | null = null;

function resolveDatabasePath(): string {
  return process.env.DATABASE_PATH?.trim() || DEFAULT_DATABASE_PATH;
}

function tryExec(database: DatabaseSync, sql: string): void {
  try {
    database.exec(sql);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("duplicate column") || message.includes("no such table")) return;
    throw err;
  }
}

function applySchema(database: DatabaseSync): void {
  // Live DBs were created before invite_token / share_token / from_user_id.
  // ALTER first: schema.sql CREATE INDEX on those columns would otherwise abort
  // the whole exec and skip the rest of applySchema.
  tryExec(database, "ALTER TABLE stories ADD COLUMN created_at TEXT");
  tryExec(database, "ALTER TABLE users ADD COLUMN invite_token TEXT");
  tryExec(database, "ALTER TABLE stories ADD COLUMN share_token TEXT");
  tryExec(database, "ALTER TABLE invitations ADD COLUMN from_user_id TEXT");

  const schemaPath = join(__dirname, "schema.sql");
  database.exec(readFileSync(schemaPath, "utf8"));

  database.exec(`
    UPDATE users SET invite_token = lower(hex(randomblob(16))) WHERE invite_token IS NULL;
    UPDATE stories SET share_token = lower(hex(randomblob(16))) WHERE share_token IS NULL;
  `);
  tryExec(
    database,
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token)",
  );
  tryExec(
    database,
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_stories_share_token ON stories(share_token)",
  );
  tryExec(
    database,
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair ON connections(user_id, connected_user_id)",
  );
  tryExec(
    database,
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_pair ON invitations(user_id, from_user_id)",
  );
}

/** Open (or return) the shared SQLite database; applies schema.sql on first open. */
export function getDb(): DatabaseSync {
  if (db) return db;
  const path = resolveDatabasePath();
  mkdirSync(dirname(path), { recursive: true });
  const conn = new DatabaseSync(path);
  try {
    applySchema(conn);
  } catch (err) {
    conn.close();
    throw err;
  }
  db = conn;
  return db;
}

/** Close the shared connection — for tests or graceful shutdown (Wint). */
export function closeDb(): void {
  if (!db) return;
  db.close();
  db = null;
}
