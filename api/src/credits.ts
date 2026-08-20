import { dailyCredits, ERROR_DAILY_QUOTA } from "./contract.ts";
import { getDb } from "./db.ts";
import { israelDay, nextResetIso, secondsUntilIsraelMidnight } from "./quota.ts";
import type { Quota } from "./types.ts";

export const CREDIT_COST = { question: 1, draft: 2 } as const;
export type CreditKind = keyof typeof CREDIT_COST;

export function isCreditKind(value: unknown): value is CreditKind {
  return value === "question" || value === "draft";
}

interface KindSum {
  kind: string;
  n: number;
}

function sums(userId: string, day: string): { admin: number; spent: number } {
  const rows = getDb()
    .prepare(
      `SELECT kind, COALESCE(SUM(delta), 0) AS n
       FROM credit_events WHERE user_id = ? AND day = ?
       GROUP BY kind`,
    )
    .all(userId, day) as KindSum[];
  let admin = 0;
  let spent = 0;
  for (const row of rows) {
    if (row.kind === "admin") admin += row.n;
    else spent -= row.n;
  }
  return { admin, spent };
}

export function balance(userId: string, day = israelDay()): Quota {
  const { admin, spent } = sums(userId, day);
  const limit = dailyCredits() + admin;
  const used = Math.max(0, spent);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: nextResetIso(),
  };
}

export type ChargeResult =
  | { ok: true; quota: Quota }
  | { ok: false; status: 429; message: string; resetsAt: string; retryAfter: number };

export function charge(userId: string, kind: CreditKind): ChargeResult {
  const cost = CREDIT_COST[kind];
  const day = israelDay();
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const quota = balance(userId, day);
    if (quota.remaining < cost) {
      db.exec("ROLLBACK");
      return {
        ok: false,
        status: 429,
        message: ERROR_DAILY_QUOTA,
        resetsAt: nextResetIso(),
        retryAfter: secondsUntilIsraelMidnight(),
      };
    }
    db.prepare(
      `INSERT INTO credit_events (user_id, day, delta, kind) VALUES (?, ?, ?, ?)`,
    ).run(userId, day, -cost, kind);
    db.exec("COMMIT");
    return { ok: true, quota: balance(userId, day) };
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    throw err;
  }
}

export function grant(userId: string, amount: number): Quota {
  getDb()
    .prepare(`INSERT INTO credit_events (user_id, day, delta, kind) VALUES (?, ?, ?, 'admin')`)
    .run(userId, israelDay(), amount);
  return balance(userId);
}
