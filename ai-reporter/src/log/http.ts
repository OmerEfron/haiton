import { structuredLogger } from "@hono/structured-logger";
import type { Context, Hono } from "hono";
import { requestId } from "hono/request-id";
import type { RequestIdVariables } from "hono/request-id";
import { getLogger, root, runWithLogger } from "./logger.js";

function httpFields(c: Context, elapsedMs: number) {
  const interviewId = c.req.param("id");
  return {
    event: "http" as const,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    elapsedMs: Math.round(elapsedMs),
    ...(interviewId ? { interviewId } : {}),
  };
}

function httpLevel(status: number): "info" | "warn" | "error" {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "info";
}

export function useHttpLogging(app: Hono): void {
  app.use("*", requestId());
  app.use("*", async (c, next) => {
    const id = (c.var as RequestIdVariables).requestId;
    const child = root.child({ requestId: id });
    await runWithLogger(child, next);
  });
  app.use(
    "*",
    structuredLogger({
      createLogger: () => getLogger(),
      skip: (c) => c.req.method === "GET" && c.req.path === "/health",
      onResponse: (logger, c, elapsedMs) => {
        const fields = httpFields(c, elapsedMs);
        logger[httpLevel(fields.status)](fields, "request");
      },
      onError: (logger, err, c, elapsedMs) => {
        logger.error({ ...httpFields(c, elapsedMs), err }, "request failed");
      },
    }),
  );
  app.onError((_err, c) => c.json({ message: "internal error" }, 500));
}
