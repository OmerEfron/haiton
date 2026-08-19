import type { Logger } from "pino";
import { ERROR_LLM } from "../contract.js";
import { getLogger } from "../log/logger.js";

const KEEPALIVE_MS = 15_000;

/** Parse the last `data:` payload from an SSE body. */
export function parseSseJson<T>(text: string): T {
  const matches = [...text.matchAll(/^data: (.+)$/gm)];
  const last = matches.at(-1)?.[1];
  if (!last) throw new Error("empty sse payload");
  return JSON.parse(last) as T;
}

/** Stream `: keepalive` comments while `work` runs, then one `data:` JSON event. */
export function sseJson(work: () => Promise<unknown>, log: Logger = getLogger()): Response {
  const encoder = new TextEncoder();
  const started = performance.now();
  const stream = new ReadableStream({
    async start(controller) {
      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, KEEPALIVE_MS);
      try {
        const data = await work();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        log.info(
          { event: "sse.complete", elapsedMs: Math.round(performance.now() - started) },
          "sse complete",
        );
      } catch (err) {
        log.error(
          { event: "sse.error", err, elapsedMs: Math.round(performance.now() - started) },
          "sse error",
        );
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ message: ERROR_LLM })}\n\n`),
        );
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
