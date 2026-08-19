import { register } from "node:module";
import { serve } from "@hono/node-server";

register("./hook.mjs", import.meta.url);

const { createApp } = await import("./app.js");

const port = Number(process.env.PORT?.trim()) || 8788;
const app = createApp();

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`ai-reporter listening on http://0.0.0.0:${info.port}`);
});
