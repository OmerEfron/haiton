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
