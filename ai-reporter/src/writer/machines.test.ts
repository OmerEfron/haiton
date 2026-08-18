import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register("./hook.mjs", import.meta.url);

const {
  MACHINES,
  SHARED_RULES,
  forcedTypeBlock,
  pickerBlock,
} = await import("./machines.js");

describe("writer machines", () => {
  it("news machine is a pyramid, not a magazine essay", () => {
    assert.match(MACHINES.news, /פירמידה/);
    assert.match(MACHINES.news, /מסרו/);
    assert.match(MACHINES.news, /המילה הראשונה בגוף היא הזמן/);
    assert.doesNotMatch(MACHINES.news, /עוד נחזור לרגע הזה/);
  });

  it("each type has a distinct closer", () => {
    assert.match(MACHINES.news, /הצעד הבא/);
    assert.match(MACHINES.profile, /הימור/);
    assert.match(MACHINES.feature, /אופק/);
    assert.match(MACHINES.interview, /תשובה האחרונה/);
    assert.match(MACHINES.column, /הפרק הבא/);
  });

  it("shared rules forbid karteset stuffing", () => {
    assert.match(SHARED_RULES, /כרטסת/);
    assert.match(SHARED_RULES, /לא מילוי/);
  });

  it("does not seed a fake subject name or job for the model to copy", () => {
    assert.doesNotMatch(MACHINES.profile, /תומר/);
    assert.doesNotMatch(SHARED_RULES, /תומר/);
    assert.doesNotMatch(MACHINES.profile, /מנהל פרויקטים/);
    assert.match(SHARED_RULES, /המרואיין:/);
    assert.match(MACHINES.profile, /אם אין גיל או תפקיד/);
  });

  it("forced news instructions omit the picker", () => {
    const text = forcedTypeBlock("news", "factual");
    assert.match(text, /מכונת חדשות/);
    assert.doesNotMatch(text, /בחר סוג לפי החומר/);
  });

  it("auto instructions include every machine", () => {
    const text = pickerBlock();
    assert.match(text, /בחר סוג לפי החומר/);
    for (const type of Object.keys(MACHINES)) {
      assert.match(text, new RegExp(`### ${type}`));
    }
  });
});
