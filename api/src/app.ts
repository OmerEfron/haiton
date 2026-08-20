import { Hono } from "hono";
import { cors } from "hono/cors";
import { ERROR_RATE_LIMIT } from "./contract.ts";
import { authRouter } from "./auth/index.ts";
import { createAdminRouter } from "./admin/router.ts";
import { createCircleRouter } from "./circle/router.ts";
import { createDeskRouter } from "./desk/router.ts";
import { clientIp, rateLimit } from "./http/rateLimit.ts";
import { kartesetRouter } from "./karteset/router.ts";
import { useHttpLogging } from "./log/http.ts";
import { profileRouter } from "./profile/index.ts";
import { createStoriesRouter } from "./stories/router.ts";

const DEFAULT_ORIGIN = "http://localhost:5173";

export function createApp(): Hono {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: (process.env.FRONTEND_ORIGIN || DEFAULT_ORIGIN)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      credentials: true,
    }),
  );
  useHttpLogging(app);

  app.use(
    "/auth/sign-in",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      message: ERROR_RATE_LIMIT,
      key: (c) => `auth:${clientIp(c)}`,
    }),
  );
  app.use(
    "/auth/sign-up",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      message: ERROR_RATE_LIMIT,
      key: (c) => `auth:${clientIp(c)}`,
    }),
  );
  app.use(
    "*",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      message: ERROR_RATE_LIMIT,
      key: (c) => `ip:${clientIp(c)}`,
      skip: (c) => {
        const path = c.req.path;
        return (
          (c.req.method === "GET" && path === "/health") ||
          path === "/auth/sign-in" ||
          path === "/auth/sign-up"
        );
      },
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/", authRouter);
  app.route("/", profileRouter);
  app.route("/", kartesetRouter);
  app.route("/", createStoriesRouter());
  app.route("/", createDeskRouter());
  app.route("/", createCircleRouter());
  app.route("/", createAdminRouter());

  return app;
}
