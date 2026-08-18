import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register("./hook.mjs", import.meta.url);

const { personaFacts } = await import("../fixtures/persona.js");
const { weekAnswers } = await import("../fixtures/week-answers.js");
const { getCallCount } = await import("../llm.js");
const { GENERIC_QUESTION_NEEDLES } = await import("../types.js");
const { nextQuestion } = await import("./interviewer.js");

function stripPunctuation(text: string): string {
  return text.replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function tokens(text: string): string[] {
  return stripPunctuation(text)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
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
  priorAnswers: string[],
): boolean {
  const questionTokens = tokens(question);
  const corpusTokens = new Set(
    tokens([...facts.map((f) => f.text), ...priorAnswers].join(" ")),
  );

  return questionTokens.some((qt) =>
    [...corpusTokens].some(
      (ct) => ct === qt || ct.includes(qt) || qt.includes(ct),
    ),
  );
}

describe("interviewer live", () => {
  it("asks 1–4 grounded Hebrew questions", async () => {
    if (!process.env.OPENAI_API_KEY) {
      assert.fail("OPENAI_API_KEY is required for live interviewer test");
    }

    const turns: Array<{ question: string; answer: string }> = [];
    const questions: string[] = [];
    let answerIdx = 0;

    while (true) {
      const result = await nextQuestion(personaFacts, turns);

      if (result.done && !result.question) {
        break;
      }

      assert.ok(result.question, "expected a question when not done-without-question");
      questions.push(result.question);
      console.log(`Q${questions.length}: ${result.question}`);

      assert.ok(
        !hasGenericNeedle(result.question),
        `generic needle in question: ${result.question}`,
      );
      assert.ok(
        isGrounded(
          result.question,
          personaFacts,
          turns.map((t) => t.answer),
        ),
        `question not grounded in facts or prior answers: ${result.question}`,
      );

      if (result.done) {
        break;
      }

      assert.ok(
        answerIdx < weekAnswers.length,
        "ran out of canned answers before interviewer finished",
      );
      turns.push({
        question: result.question,
        answer: weekAnswers[answerIdx]!,
      });
      answerIdx += 1;
    }

    assert.ok(questions.length >= 1 && questions.length <= 4, {
      message: `expected 1–4 questions, got ${questions.length}`,
    });
    assert.ok(getCallCount() <= 8, `LLM budget exceeded: ${getCallCount()} calls`);
  });
});
