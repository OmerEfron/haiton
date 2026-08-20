/** Calendar day and daily caps. Asia/Jerusalem — the edition timezone. */

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
