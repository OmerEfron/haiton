import { ApiError } from "../client";

const REPORTER_BASE = import.meta.env.VITE_REPORTER_URL ?? "";

/** HTTP client for the reporter service — same error/204 handling as core `request()`. */
export async function reporterRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${REPORTER_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const body = (await res.json()) as { message?: string };
      if (typeof body.message === "string" && body.message) message = body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
