import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { seed } from "./seed.ts";

const port = Number(process.env.PORT ?? 8787);

seed();
serve({ fetch: createApp().fetch, port, hostname: "0.0.0.0" });

console.log(`API listening on http://0.0.0.0:${port}`);
