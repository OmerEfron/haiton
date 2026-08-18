import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register("./writer/hook.mjs", import.meta.url);

const { personaFacts } = await import("./fixtures/persona.js");
const { weekAnswers } = await import("./fixtures/week-answers.js");
const { GENERIC_QUESTION_NEEDLES, WORD_COUNT } = await import("./types.js");
const { runReporter } = await import("./run.js");

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

function wordCount(paragraphs: string[]): number {
  return paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

function hasLongEnglishSentence(text: string): boolean {
  const sentences = text.split(/[.!??\u05BE\u05C3\n]+/);
  return sentences.some((s) => {
    const words = s.match(/[A-Za-z]{2,}/g);
    return words !== null && words.length >= 4;
  });
}

describe("runReporter live e2e", () => {
  it("interviews then writes an intimate feature article", async () => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required");
    }

    const { questions, article, llmCalls } = await runReporter({
      facts: personaFacts,
      answers: [...weekAnswers],
      tone: "intimate",
      type: "feature",
    });

    const priorAnswers: string[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      assert.ok(!hasGenericNeedle(q), `generic needle in question: ${q}`);
      assert.ok(
        isGrounded(q, personaFacts, priorAnswers),
        `question not grounded: ${q}`,
      );
      if (i < weekAnswers.length) {
        priorAnswers.push(weekAnswers[i]!);
      }
    }

    assert.ok(questions.length >= 1 && questions.length <= 4, {
      message: `expected 1–4 questions, got ${questions.length}`,
    });

    const band = WORD_COUNT.feature;
    const words = wordCount(article.paragraphs);

    assert.equal(article.tone, "intimate");
    assert.equal(article.type, "feature");
    assert.ok(article.angle.trim());
    assert.ok(article.headline.trim());
    assert.ok(article.standfirst.trim());
    assert.ok(article.paragraphs.length >= 2);
    assert.ok(article.paragraphs.length <= 8);
    assert.ok(words >= band.min && words <= band.max);

    const body = [
      article.headline,
      article.standfirst,
      ...article.paragraphs,
    ].join("\n");
    assert.ok(!hasLongEnglishSentence(body), "article must be Hebrew");

    assert.ok(llmCalls <= 5, `expected ≤5 LLM calls, got ${llmCalls}`);

    console.log("\n--- Questions ---");
    questions.forEach((q, i) => console.log(`Q${i + 1}: ${q}`));

    console.log("\n--- Article ---");
    console.log(`Angle: ${article.angle}`);
    console.log(`Headline: ${article.headline}`);
    console.log(`Standfirst: ${article.standfirst}`);
    console.log(`Word count: ${words}`);
    console.log("Paragraphs:");
    article.paragraphs.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    console.log(`[llm] total calls: ${llmCalls}`);
  });
});
