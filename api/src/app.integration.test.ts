import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SESSION_COOKIE_NAME } from "./contract.ts";
import { closeDb } from "./db.ts";
import { createApp } from "./app.ts";
import { seed } from "./seed.ts";
import type { FrontPage, Profile } from "./types.ts";

const SEED_EMAIL = "omer@example.com";
const SEED_PASSWORD = "iton-dev";

type App = ReturnType<typeof createApp>;

function tempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), "iton-int-")), "test.sqlite");
}

function cookieHeader(res: Response): string {
  const raw = res.headers.get("set-cookie");
  assert.ok(raw, "missing set-cookie");
  const match = raw.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  assert.ok(match?.[1], "missing session cookie");
  return `${SESSION_COOKIE_NAME}=${match[1]}`;
}

async function json(
  app: App,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const res = await app.request(path, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

async function authedGet(app: App, cookie: string, path: string) {
  return json(app, path, { headers: { Cookie: cookie } });
}

function setup(): App {
  process.env.SEED_USER_EMAIL = SEED_EMAIL;
  process.env.SEED_USER_PASSWORD = SEED_PASSWORD;
  closeDb();
  seed();
  return createApp();
}

function teardown(dbPath: string): void {
  closeDb();
  rmSync(join(dbPath, ".."), { recursive: true, force: true });
  delete process.env.DATABASE_PATH;
  delete process.env.SEED_USER_EMAIL;
  delete process.env.SEED_USER_PASSWORD;
}

const UI_GETS = [
  "/auth/session",
  "/profile",
  "/editions/current",
  "/flashes",
  "/stories",
  "/karteset/facts",
  "/connections",
  "/connections/summary",
  "/invitations",
  "/quota",
  "/desk/brief",
] as const;

test("seeded user: every UI GET returns 200 with wire shapes", async () => {
  const dbPath = tempDbPath();
  process.env.DATABASE_PATH = dbPath;
  try {
    const app = setup();
    const signIn = await app.request("/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    });
    assert.equal(signIn.status, 200, await signIn.text());
    const cookie = cookieHeader(signIn);

    for (const path of UI_GETS) {
      const { status, body } = await authedGet(app, cookie, path);
      assert.equal(status, 200, `${path} → ${status} ${JSON.stringify(body)}`);
    }

    const edition = (await authedGet(app, cookie, "/editions/current")).body as FrontPage;
    assert.equal(typeof edition.editionNumber, "number");
    assert.equal(edition.lead, null);
    assert.deepEqual(edition.flashes, []);
    assert.ok(Array.isArray(edition.ticker));
    assert.ok(Array.isArray(edition.secondary));
    assert.ok(Array.isArray(edition.list));
    assert.ok(Array.isArray(edition.digests));

    const profile = (await authedGet(app, cookie, "/profile")).body as Profile;
    assert.equal(profile.user.email, SEED_EMAIL);
    assert.equal(profile.stats.storiesPublished, 0);
    assert.equal(typeof profile.stats.draftsInProgress, "number");

    const facts = (await authedGet(app, cookie, "/karteset/facts")).body as unknown[];
    assert.deepEqual(facts, []);
    const connections = (await authedGet(app, cookie, "/connections")).body as unknown[];
    assert.deepEqual(connections, []);
  } finally {
    teardown(dbPath);
  }
});

test("new sign-up: UI GETs return 200, not 500", async () => {
  const dbPath = tempDbPath();
  process.env.DATABASE_PATH = dbPath;
  try {
    const app = setup();
    const signUp = await app.request("/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "נועה שגב",
        email: "noa@example.com",
        password: "iton-dev",
      }),
    });
    assert.equal(signUp.status, 200, await signUp.text());
    const cookie = cookieHeader(signUp);

    for (const path of UI_GETS) {
      const { status, body } = await authedGet(app, cookie, path);
      assert.notEqual(status, 500, `${path} crashed: ${JSON.stringify(body)}`);
      assert.equal(status, 200, `${path} → ${status} ${JSON.stringify(body)}`);
    }

    const edition = (await authedGet(app, cookie, "/editions/current")).body as FrontPage;
    assert.equal(edition.lead, null);
    assert.deepEqual(edition.flashes, []);
    assert.equal(typeof edition.editionNumber, "number");

    const profile = (await authedGet(app, cookie, "/profile")).body as Profile;
    assert.equal(profile.user.email, "noa@example.com");
    assert.equal(profile.stats.storiesPublished, 0);

    const flashes = (await authedGet(app, cookie, "/flashes")).body as {
      flashes: unknown[];
      dateShort: string;
    };
    assert.deepEqual(flashes.flashes, []);
    assert.equal(typeof flashes.dateShort, "string");
  } finally {
    teardown(dbPath);
  }
});
