import { register } from "node:module";
import { serve } from "@hono/node-server";

register("./hook.mjs", import.meta.url);

const { createApp } = await import("./app.js");
const { getLogger } = await import("../log/logger.js");

const port = Number(process.env.PORT?.trim()) || 8788;
const app = createApp();

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  getLogger().info({ event: "process.start", port: info.port }, "ai-reporter listening");
});
