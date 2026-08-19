import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SESSION_COOKIE_NAME } from "./contract.ts";
import { closeDb } from "./db.ts";
import { createApp } from "./app.ts";
import { seed } from "./seed.ts";

const SEED_EMAIL = "omer@example.com";
const SEED_PASSWORD = "iton-dev";

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "iton-app-"));
  return join(dir, "test.sqlite");
}

function cookieFromResponse(res: Response): string | undefined {
  const raw = res.headers.get("set-cookie");
  if (!raw) return undefined;
  const match = raw.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match?.[1];
}

test("integrated app: /health and one GET per module", async () => {
  const dbPath = tempDbPath();
  try {
    process.env.DATABASE_PATH = dbPath;
    process.env.SEED_USER_EMAIL = SEED_EMAIL;
    process.env.SEED_USER_PASSWORD = SEED_PASSWORD;
    closeDb();
    seed();
    const app = createApp();

    const health = await app.request("/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });

    const signIn = await app.request("/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    });
    assert.equal(signIn.status, 200);
    const sessionCookie = cookieFromResponse(signIn);
    assert.ok(sessionCookie);
    const cookie = `${SESSION_COOKIE_NAME}=${sessionCookie}`;

    const session = await app.request("/auth/session", {
      headers: { Cookie: cookie },
    });
    assert.equal(session.status, 200);

    const profile = await app.request("/profile", { headers: { Cookie: cookie } });
    assert.equal(profile.status, 200);

    const facts = await app.request("/karteset/facts", { headers: { Cookie: cookie } });
    assert.equal(facts.status, 200);

    const edition = await app.request("/editions/current", {
      headers: { Cookie: cookie },
    });
    assert.equal(edition.status, 200);

    const connections = await app.request("/connections", {
      headers: { Cookie: cookie },
    });
    assert.equal(connections.status, 200);
  } finally {
    closeDb();
    rmSync(join(dbPath, ".."), { recursive: true, force: true });
    delete process.env.DATABASE_PATH;
    delete process.env.SEED_USER_EMAIL;
    delete process.env.SEED_USER_PASSWORD;
  }
});
