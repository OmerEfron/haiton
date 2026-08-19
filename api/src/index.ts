import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { getLogger } from "./log/logger.ts";
import { seed } from "./seed.ts";

const port = Number(process.env.PORT ?? 8787);

seed();
// Fly 6PN (.internal) is IPv6; 0.0.0.0 only answers the public proxy on IPv4.
serve({ fetch: createApp().fetch, port, hostname: "::" });

getLogger().info({ event: "process.start", port }, "api listening");
