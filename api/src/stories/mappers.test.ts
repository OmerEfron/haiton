import assert from "node:assert/strict";
import test from "node:test";
import { nowPublishedAt } from "./mappers.ts";

test("nowPublishedAt empty dateShort does not produce a leading comma", () => {
  const now = new Date(2026, 0, 1, 12, 39);
  const { time, full } = nowPublishedAt("", now);
  assert.equal(time, "12:39");
  assert.equal(full, "01.01.26, 12:39");
  assert.ok(!full.startsWith(","));
});

test("nowPublishedAt keeps the date part of a stamped short date", () => {
  const now = new Date(2026, 0, 1, 12, 39);
  const { full } = nowPublishedAt("ראשון, 01.01.26", now);
  assert.equal(full, "01.01.26, 12:39");
});
