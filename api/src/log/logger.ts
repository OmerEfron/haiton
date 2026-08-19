import { AsyncLocalStorage } from "node:async_hooks";
import { hostname } from "node:os";
import pino, { type Logger } from "pino";

const SERVICE = "iton-api";

const als = new AsyncLocalStorage<Logger>();

function level(): string {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  if (process.env.NODE_TEST_CONTEXT) return "silent";
  return "info";
}

export const root = pino({
  level: level(),
  base: { pid: process.pid, hostname: hostname(), service: SERVICE },
  redact: [
    "password",
    "*.password",
    "cookie",
    "authorization",
    "*.token",
    "apiKey",
    "OPENAI_API_KEY",
  ],
  serializers: { err: pino.stdSerializers.err },
});

export function getLogger(): Logger {
  return als.getStore() ?? root;
}

export function runWithLogger<T>(child: Logger, fn: () => T): T {
  return als.run(child, fn);
}

function asError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

process.on("unhandledRejection", (reason) => {
  root.error({ event: "process.unhandled", err: asError(reason) }, "unhandled rejection");
});

process.on("uncaughtException", (err) => {
  root.fatal({ event: "process.unhandled", err }, "uncaught exception");
  process.exit(1);
});
