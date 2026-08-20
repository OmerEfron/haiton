import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register("./http/hook.mjs", import.meta.url);

const { personaFacts } = await import("./fixtures/persona.js");
const { briefFromFacts } = await import("./types.js");
const { formatInterviewBrief, formatWriteBrief } = await import("./brief.js");

const brief = {
  ...briefFromFacts(personaFacts, "עומר"),
  subject: { name: "עומר", city: "חיפה", headline: "מפתח" },
  circle: [{ name: "דנה כהן", relationLabel: "שכנה", sectionName: "חברים" }],
  recent: [{ headline: "המשוב הראשון", angle: "עבודה" }],
};

describe("brief packs", () => {
  it("interview pack includes circle, city, categorized facts, and recent headline", () => {
    const text = formatInterviewBrief(brief);
    assert.match(text, /עומר/);
    assert.match(text, /חיפה/);
    assert.match(text, /עבודה:/);
    assert.match(text, /דנה כהן — שכנה/);
    assert.match(text, /המשוב הראשון \(עבודה\)/);
  });

  it("write pack is stingy: identity and prior headlines, not the circle roster", () => {
    const text = formatWriteBrief(brief);
    assert.match(text, /המרואיין: עומר/);
    assert.match(text, /חיפה/);
    assert.match(text, /רקע \(עובדות לבדיקה/);
    assert.match(text, /פורסם קודם: המשוב הראשון/);
    assert.doesNotMatch(text, /דנה כהן/);
    assert.doesNotMatch(text, /שכנה/);
    assert.doesNotMatch(text, /מעגל:/);
  });

  it("write pack forbids inventing a name when none was given", () => {
    const text = formatWriteBrief(briefFromFacts([]));
    assert.match(text, /השם לא סופק/);
  });
});
