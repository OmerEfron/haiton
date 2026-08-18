/* The single seam between the UI and the outside world.
 *
 * Today every function under src/api/core and src/api/reporter resolves from
 * the in-memory store in src/mocks. When the real services land, this file is
 * where the HTTP client is constructed, and each mock body is replaced with a
 * call to it. Function signatures under api/ must not change.
 *
 * Planned deployment: two independent services.
 *   core     — auth, users, CRUD, the social graph.
 *   reporter — the interviewing / story-writing agent.
 */

/** Simulated round-trip so loading and pending states are exercised for real. */
export function delay(ms = 240): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every read returns a fresh copy, exactly as a real HTTP response would.
 *  Without this the in-memory store hands back the same mutated object and
 *  React Query cannot tell that anything changed. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Stable-enough id generator for optimistically created mock records. */
let seq = 0;
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq}`;
}

/** Shape errors the same way both future services will. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** HTTP client for core (and later reporter) services. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
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
