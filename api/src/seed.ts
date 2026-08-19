import { randomUUID } from "node:crypto";
import { hashPassword } from "./auth/password.ts";
import { getDb } from "./db.ts";
import { provisionUser } from "./provision.ts";

const DEFAULT_PASSWORD = "iton-dev";
const DEFAULT_NAME = "עומר";

/** Idempotent login-only seed: one user, empty edition. No-op without SEED_USER_EMAIL. */
export function seed(): void {
  if (process.env.NODE_ENV === "production") return;
  const email = process.env.SEED_USER_EMAIL?.trim();
  if (!email) return;
  const password = process.env.SEED_USER_PASSWORD?.trim() || DEFAULT_PASSWORD;
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
    .get(email) as { id: string } | undefined;
  if (existing) return;

  const userId = randomUUID();
  const initial = [...DEFAULT_NAME][0] ?? DEFAULT_NAME.charAt(0);
  const editionName = `המהדורה של ${DEFAULT_NAME}`;

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(userId, DEFAULT_NAME, email, hashPassword(password), initial);
  provisionUser(db, userId, editionName);
}
