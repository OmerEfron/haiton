import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register("./hook.mjs", import.meta.url);

const { personaFacts } = await import("../fixtures/persona.js");
const { weekAnswers } = await import("../fixtures/week-answers.js");
const { getCallCount } = await import("../llm.js");
const { WORD_COUNT } = await import("../types.js");
const { writeArticle } = await import("./writer.js");

const turns = [
  {
    question: "איך הלך המשוב הראשון עם המפתח שאתה מנהל בראש צוות?",
    answer: weekAnswers[0],
  },
  {
    question: "מה קרה בריצה בבת גלים אחרי שיחת המשוב?",
    answer: weekAnswers[1],
  },
  {
    question: "מה מיכל אמרה כשהתקשרת אליה בערב?",
    answer: weekAnswers[2],
  },
  {
    question: "מה תעשה מחר בפגישה עם המפתח?",
    answer: weekAnswers[3],
  },
];

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

describe("writeArticle", () => {
  it("writes a factual news article from persona and week answers", async () => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required");
    }

    const article = await writeArticle({
      facts: personaFacts,
      turns,
      tone: "factual",
      type: "news",
    });

    const band = WORD_COUNT.news;
    const words = wordCount(article.paragraphs);

    assert.equal(article.tone, "factual");
    assert.equal(article.type, "news");
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

    console.log("\n--- Article ---");
    console.log(`Angle: ${article.angle}`);
    console.log(`Headline: ${article.headline}`);
    console.log(`Standfirst: ${article.standfirst}`);
    console.log(`Word count: ${words}`);
    console.log("Paragraphs:");
    article.paragraphs.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    console.log(`[llm] calls used: ${getCallCount()}/4`);
  });
});
