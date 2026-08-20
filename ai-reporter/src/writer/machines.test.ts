import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register("./hook.mjs", import.meta.url);

const {
  MACHINES,
  SHARED_RULES,
  forcedTypeBlock,
  forcedTypePickToneBlock,
  pickerBlock,
} = await import("./machines.js");
const { buildInstructions } = await import("./writer.js");

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

  it("shared rules keep thin interviews short and ban padding phrases", () => {
    assert.match(SHARED_RULES, /1–2 תשובות/);
    assert.match(SHARED_RULES, /2–3 פסקאות קצרות/);
    assert.match(SHARED_RULES, /לא נמסר/);
    assert.match(SHARED_RULES, /לא זוהה/);
    assert.match(SHARED_RULES, /אם תימסר התייחסות/);
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
    assert.match(text, /טון נלווה/);
    for (const type of Object.keys(MACHINES)) {
      assert.match(text, new RegExp(`### ${type}`));
    }
  });

  it("locked-tone picker keeps type choice and forbids changing tone", () => {
    const text = pickerBlock("intimate");
    assert.match(text, /בחר סוג לפי החומר/);
    assert.match(text, /טון קבוע/);
    assert.match(text, /אישי ואינטימי/);
    assert.doesNotMatch(text, /טון נלווה/);
  });

  it("forced type with auto tone omits the type picker", () => {
    const text = forcedTypePickToneBlock("news");
    assert.match(text, /מכונת חדשות/);
    assert.match(text, /בחר טון מהרשימה/);
    assert.match(text, /factual/);
    assert.doesNotMatch(text, /בחר סוג לפי החומר/);
  });
});

describe("buildInstructions", () => {
  it("both omitted asks the model for type and tone", () => {
    const text = buildInstructions();
    assert.match(text, /בחר סוג לפי החומר/);
    assert.match(text, /"type": "news\|profile\|feature\|interview\|column"/);
    assert.match(text, /"tone": "factual\|magazine\|witty\|dramatic\|intimate"/);
  });

  it("both set uses the forced machine and omits pick fields", () => {
    const text = buildInstructions("news", "factual");
    assert.match(text, /מכונת חדשות/);
    assert.match(text, /עיתונאי ענייני/);
    assert.doesNotMatch(text, /בחר סוג לפי החומר/);
    assert.doesNotMatch(text, /"type": "news\|profile/);
    assert.doesNotMatch(text, /"tone": "factual\|magazine/);
  });

  it("type only asks for tone", () => {
    const text = buildInstructions("news");
    assert.match(text, /מכונת חדשות/);
    assert.match(text, /בחר טון מהרשימה/);
    assert.doesNotMatch(text, /"type": "news\|profile/);
    assert.match(text, /"tone": "factual\|magazine\|witty\|dramatic\|intimate"/);
  });

  it("tone only asks for type", () => {
    const text = buildInstructions(undefined, "intimate");
    assert.match(text, /בחר סוג לפי החומר/);
    assert.match(text, /טון קבוע/);
    assert.match(text, /"type": "news\|profile\|feature\|interview\|column"/);
    assert.doesNotMatch(text, /"tone": "factual\|magazine/);
  });
});
