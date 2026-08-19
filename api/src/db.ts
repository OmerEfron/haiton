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

function applySchema(database: DatabaseSync): void {
  const schemaPath = join(__dirname, "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  database.exec(sql);
  try {
    // ponytail: SQLite rejects ALTER ... DEFAULT (datetime('now')) as non-constant.
    database.exec("ALTER TABLE stories ADD COLUMN created_at TEXT");
  } catch {
    /* column already exists on fresh schema */
  }
}

/** Open (or return) the shared SQLite database; applies schema.sql on first open. */
export function getDb(): DatabaseSync {
  if (db) return db;
  const path = resolveDatabasePath();
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  applySchema(db);
  return db;
}

/** Close the shared connection — for tests or graceful shutdown (Wint). */
export function closeDb(): void {
  if (!db) return;
  db.close();
  db = null;
}
