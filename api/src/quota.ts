/** Calendar day and daily caps. Asia/Jerusalem — the edition timezone. */

import { DAILY_INTERVIEW_LIMIT } from "./contract.ts";

const TZ = "Asia/Jerusalem";

export function israelDay(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function secondsUntilIsraelMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Math.max(1, 24 * 3600 - num("hour") * 3600 - num("minute") * 60 - num("second"));
}

export function nextResetIso(now = new Date()): string {
  return new Date(now.getTime() + secondsUntilIsraelMidnight(now) * 1000).toISOString();
}

export function israelDayFromStored(s: string | null | undefined): string | null {
  if (!s) return null;
  const iso = /T|Z|\+/.test(s) ? s : `${s.replace(" ", "T")}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return israelDay(d);
}

export function countToday(stored: (string | null | undefined)[]): number {
  const today = israelDay();
  return stored.filter((s) => israelDayFromStored(s) === today).length;
}

export function quotaPayload(used: number) {
  return {
    limit: DAILY_INTERVIEW_LIMIT,
    used,
    remaining: Math.max(0, DAILY_INTERVIEW_LIMIT - used),
    resetsAt: nextResetIso(),
  };
}
