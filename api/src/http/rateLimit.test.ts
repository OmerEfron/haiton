import assert from "node:assert/strict";
import { Hono } from "hono";
import { test } from "node:test";
import { rateLimit } from "./rateLimit.ts";

test("rateLimit returns 429 after the limit", async () => {
  const app = new Hono();
  app.use(
    "*",
    rateLimit({
      windowMs: 60_000,
      limit: 2,
      message: "יותר מדי בקשות. נסו שוב בעוד רגע.",
      key: () => "t",
    }),
  );
  app.get("/", (c) => c.json({ ok: true }));

  assert.equal((await app.request("/")).status, 200);
  assert.equal((await app.request("/")).status, 200);
  const blocked = await app.request("/");
  assert.equal(blocked.status, 429);
  const body = (await blocked.json()) as { message: string };
  assert.equal(body.message, "יותר מדי בקשות. נסו שוב בעוד רגע.");
  assert.ok(blocked.headers.get("Retry-After"));
});
