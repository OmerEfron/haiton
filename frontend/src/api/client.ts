/* HTTP client for the core API (auth, users, CRUD, social graph).
 * Reporter traffic goes through src/api/reporter/fetch.ts (VITE_REPORTER_URL). */

export class ApiError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, status = 400, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (retryAfter != null) this.retryAfter = retryAfter;
  }
}

function retryAfterOf(res: Response): number | undefined {
  const raw = res.headers.get("Retry-After");
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  return Number(raw);
}

export async function readError(res: Response): Promise<ApiError> {
  let message = res.statusText || "Request failed";
  try {
    const body = (await res.json()) as { message?: string };
    if (typeof body.message === "string" && body.message) message = body.message;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(message, res.status, retryAfterOf(res));
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** HTTP client for the core service. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("X-Request-Id")) {
    headers.set("X-Request-Id", crypto.randomUUID());
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw await readError(res);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
