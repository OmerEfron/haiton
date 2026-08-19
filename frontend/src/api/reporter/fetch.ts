import { ApiError, readError } from "../client";

const REPORTER_BASE = import.meta.env.VITE_REPORTER_URL ?? "";

/** HTTP client for the reporter service — same error/204 handling as core `request()`. */
export async function reporterRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("X-Request-Id")) {
    headers.set("X-Request-Id", crypto.randomUUID());
  }

  const res = await fetch(`${REPORTER_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!res.ok) throw await readError(res);

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("text/event-stream")) {
    const matches = [...text.matchAll(/^data: (.+)$/gm)];
    const last = matches.at(-1)?.[1];
    if (!last) throw new ApiError("Empty reporter stream");
    const parsed: unknown = JSON.parse(last);
    if (
      parsed &&
      typeof parsed === "object" &&
      "message" in parsed &&
      !("id" in parsed) &&
      typeof (parsed as { message: unknown }).message === "string"
    ) {
      throw new ApiError((parsed as { message: string }).message, 502);
    }
    return parsed as T;
  }
  return JSON.parse(text) as T;
}
