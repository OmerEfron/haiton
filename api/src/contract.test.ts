import assert from "node:assert/strict";
import test from "node:test";
import { ROUTES, routeKey } from "./contract.ts";

/** Every row in docs/features/core-api/PLAN.md frozen contract table. */
const PLAN_ROUTES: { method: string; path: string; handler?: string }[] = [
  { method: "GET", path: "/health" },
  { method: "GET", path: "/auth/session", handler: "getSession" },
  { method: "POST", path: "/auth/sign-in", handler: "signIn" },
  { method: "POST", path: "/auth/sign-up", handler: "signUp" },
  { method: "POST", path: "/auth/sign-out", handler: "signOut" },
  { method: "GET", path: "/editions/current", handler: "getFrontPage" },
  { method: "GET", path: "/stories/:id", handler: "getStory" },
  { method: "GET", path: "/stories", handler: "listStories" },
  { method: "GET", path: "/flashes", handler: "listFlashes" },
  { method: "POST", path: "/stories", handler: "publishStory" },
  { method: "GET", path: "/profile", handler: "getProfile" },
  { method: "PATCH", path: "/profile/edition-settings", handler: "updateEditionSettings" },
  { method: "GET", path: "/karteset/facts", handler: "listFacts" },
  { method: "POST", path: "/karteset/facts", handler: "addFact" },
  { method: "PATCH", path: "/karteset/facts/:id", handler: "updateFact" },
  { method: "DELETE", path: "/karteset/facts/:id", handler: "removeFact" },
  { method: "GET", path: "/connections", handler: "listConnections" },
  { method: "GET", path: "/connections/summary", handler: "getCircleSummary" },
  { method: "GET", path: "/connections/suggested", handler: "listSuggestedConnections" },
  { method: "GET", path: "/invitations", handler: "listInvitations" },
  { method: "POST", path: "/invitations", handler: "sendInvitation" },
  { method: "POST", path: "/invitations/:id/respond", handler: "respondToInvitation" },
  { method: "DELETE", path: "/invitations/:id", handler: "cancelInvitation" },
  { method: "PATCH", path: "/connections/:id", handler: "updateConnection" },
  { method: "DELETE", path: "/connections/:id", handler: "removeConnection" },
  { method: "GET", path: "/readers", handler: "searchReaders" },
];

test("contract.ts lists every PLAN.md route", () => {
  const indexed = new Map(ROUTES.map((r) => [routeKey(r), r]));

  for (const expected of PLAN_ROUTES) {
    const key = routeKey({ method: expected.method as "GET", path: expected.path });
    const found = indexed.get(key);
    assert.ok(found, `missing route: ${key}`);
    assert.equal(found.handler, expected.handler, `handler mismatch for ${key}`);
  }

  assert.equal(
    ROUTES.length,
    PLAN_ROUTES.length,
    "contract.ts has extra routes not in PLAN.md",
  );

  console.log(
    `✓ every PLAN.md route (${PLAN_ROUTES.length}) is in contract.ts`,
  );
});
