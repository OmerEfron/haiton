import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../app.ts";
import { SESSION_COOKIE_NAME } from "../contract.ts";
import { closeDb, getDb } from "../db.ts";
import { provisionUser } from "../provision.ts";
import type { FrontPage, Invitation, JoinResult, SharedStory } from "../types.ts";
import { insertConnectionPair } from "./graph.ts";

let tempDir = "";
const A = {
  id: "u_a",
  name: "אלון",
  email: "a@example.com",
  token: "invite_a",
  session: "sess_a",
};
const B = {
  id: "u_b",
  name: "נועה",
  email: "b@example.com",
  token: "invite_b",
  session: "sess_b",
};

function resetDb(): void {
  closeDb();
  tempDir = mkdtempSync(join(tmpdir(), "iton-circle-"));
  process.env.DATABASE_PATH = join(tempDir, "test.sqlite");
  getDb();
}

function seedPerson(person: typeof A): void {
  getDb()
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, initial, publishing_since, invite_token)
       VALUES (?, ?, ?, 'x', ?, '2026', ?)`,
    )
    .run(person.id, person.name, person.email, person.name[0], person.token);
  getDb()
    .prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
    .run(person.session, person.id, "2099-01-01T00:00:00.000Z");
  provisionUser(getDb(), person.id, `המהדורה של ${person.name}`);
}

function cookie(session: string): Record<string, string> {
  return { Cookie: `${SESSION_COOKIE_NAME}=${session}` };
}

function jsonHeaders(session: string): Record<string, string> {
  return { ...cookie(session), "Content-Type": "application/json" };
}

function insertStory(
  userId: string,
  id: string,
  headline: string,
  shareToken: string,
  createdAt: string,
): void {
  const body = JSON.stringify([
    { kind: "paragraph", text: "פסקה ראשונה." },
    { kind: "paragraph", text: "פסקה שנייה." },
  ]);
  getDb()
    .prepare(
      `INSERT INTO stories (
        id, user_id, section, section_name, edition_label, headline, standfirst,
        body_json, angle, byline, published_at, placement, created_at, share_token
      ) VALUES (?, ?, 'work', 'עבודה', 'מהדורה', ?, '', ?, '', 'כתב', '01.01.26, 10:00',
                'list', ?, ?)`,
    )
    .run(id, userId, headline, body, createdAt, shareToken);
}

before(() => {
  resetDb();
});

after(() => {
  closeDb();
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  resetDb();
  seedPerson(A);
  seedPerson(B);
});

test("mixed flash carries shareToken so the client does not use /story/:id", async () => {
  insertStory(B.id, "9", "של נועה", "share_b", "2026-08-20T00:00:00.000Z");
  getDb()
    .prepare(
      `INSERT INTO flashes (id, user_id, time, text, story_id, sort_order)
       VALUES ('f_b', ?, '10:00', 'מבזק של נועה', '9', 0)`,
    )
    .run(B.id);
  insertConnectionPair(getDb(), A.id, B.id);

  const page = (await (
    await createApp().request("/editions/current", { headers: cookie(A.session) })
  ).json()) as FrontPage;
  const flash = page.flashes.find((item) => item.storyId === "9");
  assert.equal(flash?.shareToken, "share_b");
  const path = flash?.shareToken ? `/s/${flash.shareToken}` : `/story/${flash?.storyId}`;
  assert.equal(path, "/s/share_b");
});

test("GET /invitations/preview/:token is public", async () => {
  const app = createApp();
  const res = await app.request(`/invitations/preview/${A.token}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: A.id, name: A.name, initial: A.name[0] });

  const missing = await app.request("/invitations/preview/nope");
  assert.equal(missing.status, 404);
});

test("self-join is 400", async () => {
  const app = createApp();
  const res = await app.request("/invitations/join", {
    method: "POST",
    headers: jsonHeaders(A.session),
    body: JSON.stringify({ token: A.token }),
  });
  assert.equal(res.status, 400);
});

test("join from invite token creates incoming for visitor, not owner", async () => {
  const app = createApp();
  const join = await app.request("/invitations/join", {
    method: "POST",
    headers: jsonHeaders(B.session),
    body: JSON.stringify({ token: A.token }),
  });
  assert.equal(join.status, 200);
  const body = (await join.json()) as JoinResult;
  assert.equal(body.connected, false);
  assert.equal(body.inviterId, A.id);
  assert.ok(body.invitationId);

  const again = await app.request("/invitations/join", {
    method: "POST",
    headers: jsonHeaders(B.session),
    body: JSON.stringify({ token: A.token }),
  });
  const againBody = (await again.json()) as JoinResult;
  assert.equal(againBody.invitationId, body.invitationId);

  const visitor = await app.request("/invitations", { headers: cookie(B.session) });
  const incoming = (await visitor.json()) as Invitation[];
  assert.equal(incoming.length, 1);
  assert.equal(incoming[0].fromUserId, A.id);
  assert.equal(incoming[0].direction, "incoming");

  const owner = await app.request("/invitations", { headers: cookie(A.session) });
  assert.deepEqual(await owner.json(), []);
});

test("join via story share token targets the owner", async () => {
  insertStory(A.id, "1", "שלי", "share_a", "2026-01-01T00:00:00.000Z");
  const app = createApp();
  const join = await app.request("/invitations/join", {
    method: "POST",
    headers: jsonHeaders(B.session),
    body: JSON.stringify({ token: "share_a" }),
  });
  assert.equal(join.status, 200);
  const body = (await join.json()) as JoinResult;
  assert.equal(body.connected, false);
  assert.equal(body.inviterId, A.id);
});

test("accept writes two rows; mix, share, and remove stay in lockstep", async () => {
  insertStory(A.id, "1", "שלי", "share_a", "2026-01-01T00:00:00.000Z");
  insertStory(B.id, "9", "של נועה", "share_b", "2026-08-20T00:00:00.000Z");

  const app = createApp();
  const guestShare = await app.request("/stories/share/share_b");
  assert.equal(guestShare.status, 200);
  const teaser = (await guestShare.json()) as SharedStory;
  assert.equal(teaser.gated, true);
  assert.equal(teaser.body.length, 1);
  const join = await app.request("/invitations/join", {
    method: "POST",
    headers: jsonHeaders(B.session),
    body: JSON.stringify({ token: A.token }),
  });
  const { invitationId } = (await join.json()) as JoinResult;

  const accept = await app.request(`/invitations/${invitationId}/respond`, {
    method: "POST",
    headers: jsonHeaders(B.session),
    body: JSON.stringify({ accept: true }),
  });
  assert.equal(accept.status, 204);

  const pair = getDb()
    .prepare(`SELECT user_id, connected_user_id FROM connections ORDER BY user_id`)
    .all() as { user_id: string; connected_user_id: string }[];
  assert.equal(pair.length, 2);
  assert.deepEqual(
    pair.map((row) => `${row.user_id}->${row.connected_user_id}`).sort(),
    [`${A.id}->${B.id}`, `${B.id}->${A.id}`].sort(),
  );

  const mix = await app.request("/editions/current", { headers: cookie(A.session) });
  assert.equal(mix.status, 200);
  const page = (await mix.json()) as FrontPage;
  assert.equal(page.lead?.headline, "של נועה");
  assert.equal(page.lead?.shareToken, "share_b");
  assert.equal(page.lead?.author.id, B.id);

  const ownOnly = await app.request("/stories/9", { headers: cookie(A.session) });
  assert.equal(ownOnly.status, 404);

  const shared = await app.request("/stories/share/share_b", { headers: cookie(A.session) });
  assert.equal(shared.status, 200);
  const full = (await shared.json()) as SharedStory;
  assert.equal(full.gated, false);
  assert.equal(full.connected, true);
  assert.equal(full.body.length, 2);

  const friendPaper = await app.request(`/editions/${B.id}`, { headers: cookie(A.session) });
  assert.equal(friendPaper.status, 200);

  const list = await app.request("/connections", { headers: cookie(A.session) });
  const connections = (await list.json()) as { id: string }[];
  assert.equal(connections.length, 1);

  const gone = await app.request(`/connections/${connections[0].id}`, {
    method: "DELETE",
    headers: cookie(A.session),
  });
  assert.equal(gone.status, 204);
  const leftover = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM connections`)
    .get() as { n: number };
  assert.equal(leftover.n, 0);

  const after = (await (
    await app.request("/editions/current", { headers: cookie(A.session) })
  ).json()) as FrontPage;
  assert.equal(after.lead?.headline, "שלי");
  assert.ok(!after.secondary.some((s) => s.headline === "של נועה"));
  assert.ok(!after.list.some((s) => s.headline === "של נועה"));

  const blocked = await app.request(`/editions/${B.id}`, { headers: cookie(A.session) });
  assert.equal(blocked.status, 404);
});

test("removeConnection returns 404 when missing", async () => {
  const app = createApp();
  const res = await app.request("/connections/missing", {
    method: "DELETE",
    headers: cookie(A.session),
  });
  assert.equal(res.status, 404);
});

test("getCircleSummary uses zero updatedThisWeek when none published", async () => {
  const app = createApp();
  const res = await app.request("/connections/summary", { headers: cookie(A.session) });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { updatedThisWeek: number; connections: number };
  assert.equal(body.updatedThisWeek, 0);
  assert.equal(body.connections, 0);
});
