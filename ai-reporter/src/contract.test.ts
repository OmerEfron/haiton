import assert from "node:assert/strict";
import test from "node:test";
import {
  ROUTES,
  SESSION_OPENERS,
  routeKey,
} from "./contract.ts";
import { askedCount, DEFAULT_TONE, DEFAULT_TYPE } from "./types.ts";

/** Every row in docs/features/reporter-wireup/PLAN.md frozen route table. */
const PLAN_ROUTES: { method: string; path: string; handler: string }[] = [
  { method: "GET", path: "/health", handler: "health" },
  { method: "GET", path: "/interviews", handler: "getCurrent" },
  { method: "POST", path: "/interviews", handler: "createInterview" },
  { method: "GET", path: "/interviews/:id", handler: "getInterview" },
  { method: "POST", path: "/interviews/:id/messages", handler: "postMessage" },
  { method: "POST", path: "/interviews/:id/draft", handler: "requestDraft" },
  {
    method: "PATCH",
    path: "/interviews/:id/draft/section",
    handler: "setDraftSection",
  },
  {
    method: "PATCH",
    path: "/interviews/:id/form",
    handler: "setArticleForm",
  },
  { method: "DELETE", path: "/interviews/:id", handler: "discardInterview" },
];

test("contract.ts lists every PLAN.md route", () => {
  const indexed = new Map(ROUTES.map((r) => [routeKey(r), r]));

  for (const expected of PLAN_ROUTES) {
    const key = routeKey({
      method: expected.method as "GET",
      path: expected.path,
    });
    const found = indexed.get(key);
    assert.ok(found, `missing route: ${key}`);
    assert.equal(found.handler, expected.handler, `handler mismatch for ${key}`);
  }

  assert.equal(
    ROUTES.length,
    PLAN_ROUTES.length,
    "contract.ts has extra routes not in PLAN.md",
  );
});

test("askedCount ignores empty opening question", () => {
  assert.equal(askedCount([{ question: "", answer: "x" }]), 0);
});

test("askedCount counts a real reporter question", () => {
  assert.equal(
    askedCount([{ question: "", answer: "opening" }, { question: "Q1?", answer: "a" }]),
    1,
  );
});

test("DEFAULT_TONE and DEFAULT_TYPE match frozen defaults", () => {
  assert.equal(DEFAULT_TONE, "intimate");
  assert.equal(DEFAULT_TYPE, "feature");
});

test("SESSION_OPENERS has three chips", () => {
  assert.equal(SESSION_OPENERS.length, 3);
});
