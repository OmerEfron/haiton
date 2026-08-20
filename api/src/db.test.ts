import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after } from "node:test";
import { closeDb, getDb } from "./db.ts";

let tempDir = "";

after(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

test("applySchema adds circle columns to a pre-circle sqlite file", () => {
  closeDb();
  tempDir = mkdtempSync(join(tmpdir(), "iton-db-"));
  const path = join(tempDir, "old.sqlite");
  process.env.DATABASE_PATH = path;

  const raw = new DatabaseSync(path);
  raw.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      initial TEXT NOT NULL,
      publishing_since TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE invitations (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      initial TEXT NOT NULL,
      detail TEXT NOT NULL,
      direction TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    INSERT INTO users (id, name, email, password_hash, initial)
    VALUES ('u1', 'אלון', 'a@example.com', 'x', 'א');
  `);
  raw.close();

  const cols = getDb()
    .prepare("PRAGMA table_info(users)")
    .all() as { name: string }[];
  assert.ok(cols.some((c) => c.name === "invite_token"));
  const invite = getDb()
    .prepare("SELECT invite_token FROM users WHERE id = 'u1'")
    .get() as { invite_token: string };
  assert.ok(invite.invite_token);

  const invCols = getDb()
    .prepare("PRAGMA table_info(invitations)")
    .all() as { name: string }[];
  assert.ok(invCols.some((c) => c.name === "from_user_id"));
});
