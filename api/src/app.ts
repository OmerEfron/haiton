import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRouter } from "./auth/index.ts";
import { createCircleRouter } from "./circle/router.ts";
import { kartesetRouter } from "./karteset/router.ts";
import { profileRouter } from "./profile/index.ts";
import { createStoriesRouter } from "./stories/router.ts";

const DEFAULT_ORIGIN = "http://localhost:5173";

export function createApp(): Hono {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: process.env.FRONTEND_ORIGIN?.trim() || DEFAULT_ORIGIN,
      credentials: true,
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/", authRouter);
  app.route("/", profileRouter);
  app.route("/", kartesetRouter);
  app.route("/", createStoriesRouter());
  app.route("/", createCircleRouter());

  return app;
}
