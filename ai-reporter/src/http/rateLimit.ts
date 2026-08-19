import type { Context, Next } from "hono";

/** ponytail: in-memory Map, lost on restart; upgrade to Redis if we run more than one machine. */

type Entry = { n: number; reset: number };

export function clientIp(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || "127.0.0.1";
  return "127.0.0.1";
}

export function rateLimit(opts: {
  windowMs: number;
  limit: number;
  message: string;
  key: (c: Context) => string;
  skip?: (c: Context) => boolean;
}) {
  const hits = new Map<string, Entry>();
  return async (c: Context, next: Next) => {
    if (opts.skip?.(c)) return next();
    const now = Date.now();
    const k = opts.key(c);
    let e = hits.get(k);
    if (!e || e.reset <= now) e = { n: 0, reset: now + opts.windowMs };
    e.n += 1;
    hits.set(k, e);
    c.header("RateLimit-Limit", String(opts.limit));
    c.header("RateLimit-Remaining", String(Math.max(0, opts.limit - e.n)));
    c.header("RateLimit-Reset", String(Math.ceil(e.reset / 1000)));
    if (e.n > opts.limit) {
      c.header("Retry-After", String(Math.max(1, Math.ceil((e.reset - now) / 1000))));
      return c.json({ message: opts.message }, 429);
    }
    await next();
  };
}
