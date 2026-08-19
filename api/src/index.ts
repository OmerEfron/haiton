import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { getLogger } from "./log/logger.ts";
import { seed } from "./seed.ts";

const port = Number(process.env.PORT ?? 8787);

seed();
serve({ fetch: createApp().fetch, port, hostname: "0.0.0.0" });

getLogger().info({ event: "process.start", port }, "api listening");
