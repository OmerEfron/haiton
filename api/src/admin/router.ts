import { Hono } from "hono";
import type { Context, Next } from "hono";
import { balance, grant } from "../credits.ts";
import { getDb } from "../db.ts";

const MAX_GRANT = 10_000;

function adminSecret(): string {
  return process.env.ADMIN_SECRET?.trim() ?? "";
}

async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  const secret = adminSecret();
  if (!secret) return c.json({ message: "admin is not configured" }, 503);
  const got = c.req.header("X-Admin-Secret") ?? "";
  if (got !== secret) return c.json({ message: "unauthorized" }, 401);
  await next();
}

function userIdByEmail(email: string): string | undefined {
  const row = getDb()
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
    .get(email) as { id: string } | undefined;
  return row?.id;
}

export function createAdminRouter(): Hono {
  const app = new Hono();
  app.use("/admin/*", requireAdmin);

  app.get("/admin/credits", (c) => {
    const email = c.req.query("email")?.trim() ?? "";
    if (!email) return c.json({ message: "email is required" }, 400);
    const userId = userIdByEmail(email);
    if (!userId) return c.json({ message: "user not found" }, 404);
    return c.json({ email, ...balance(userId) });
  });

  app.post("/admin/credits", async (c) => {
    const body = (await c.req.json()) as { email?: unknown; amount?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!email) return c.json({ message: "email is required" }, 400);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_GRANT) {
      return c.json({ message: "amount must be a positive integer" }, 400);
    }
    const userId = userIdByEmail(email);
    if (!userId) return c.json({ message: "user not found" }, 404);
    return c.json({ email, ...grant(userId, amount) });
  });

  return app;
}
