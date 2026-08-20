import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register("./hook.mjs", import.meta.url);

const { personaFacts } = await import("../fixtures/persona.js");
const { weekAnswers } = await import("../fixtures/week-answers.js");
const { getCallCount } = await import("../llm.js");
const { GENERIC_QUESTION_NEEDLES, briefFromFacts } = await import("../types.js");
const { nextQuestion } = await import("./interviewer.js");

function stripPunctuation(text: string): string {
  return text.replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function tokens(text: string): string[] {
  return stripPunctuation(text)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function hasHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

function hasGenericNeedle(question: string): boolean {
  const normalized = question.toLowerCase();
  return GENERIC_QUESTION_NEEDLES.some((needle) =>
    normalized.includes(needle.toLowerCase()),
  );
}

function isGrounded(
  question: string,
  facts: typeof personaFacts,
  openingReport: string,
): boolean {
  const questionTokens = tokens(question);
  const corpusTokens = new Set(
    tokens([...facts.map((f) => f.text), openingReport].join(" ")),
  );

  return questionTokens.some((qt) =>
    [...corpusTokens].some(
      (ct) => ct === qt || ct.includes(qt) || qt.includes(ct),
    ),
  );
}

function openingHasFullStory(text: string): boolean {
  const lower = text.toLowerCase();
  const hasWho = /מפתח|מנהל|עומר|מיכל|צוות/.test(lower);
  const hasWhat = /משוב|שיח|דדליין|ריצ|התקשר/.test(lower);
  const hasWhen = /השבוע|מחר|אתמול|ערב|אחרי/.test(lower);
  const hasWhere = /אד|טק|בת גלים|חיפה|בית חולים/.test(lower);
  const hasStake = /לא בטוח|בגידה|מרגיש|הימור|חשוב/.test(lower);

  const w5w = [hasWho, hasWhat, hasWhen, hasWhere].filter(Boolean).length;
  return w5w >= 4 || (w5w >= 3 && hasStake);
}

describe("interviewer live", () => {
  it("asks a grounded follow-up after the reader's opening report", async () => {
    if (!process.env.OPENAI_API_KEY) {
      assert.fail("OPENAI_API_KEY is required for live interviewer test");
    }

    const opening = weekAnswers[0]!;
    const result = await nextQuestion(briefFromFacts(personaFacts, "עומר עפרון"), [
      { question: "", answer: opening },
    ]);

    console.log(`Q1: ${result.question || "(done)"}`);

    if (result.done && !result.question) {
      assert.ok(
        openingHasFullStory(opening),
        "interviewer finished without a question but opening lacks a full story",
      );
    } else {
      assert.ok(result.question, "expected a follow-up question");
      assert.ok(hasHebrew(result.question), "question should be in Hebrew");
      assert.ok(
        !hasGenericNeedle(result.question),
        `generic needle in question: ${result.question}`,
      );
      assert.ok(
        isGrounded(result.question, personaFacts, opening),
        `question not grounded in facts or opening: ${result.question}`,
      );
      assert.ok(
        result.done === false || openingHasFullStory(opening),
        "expected done=false unless opening already tells a full story",
      );
    }

    assert.ok(getCallCount() >= 1, `expected at least one LLM call, got ${getCallCount()}`);
  });
});
