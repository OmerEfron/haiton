import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";
import type { Turn } from "../types.ts";

register("./hook.mjs", import.meta.url);

const {
  llmFns,
  PLACEHOLDER_ARTICLE,
  PLACEHOLDER_QUESTIONS,
  placeholderNextQuestion,
  placeholderWriteArticle,
  thinkMs,
  allowTestMode,
} = await import("./placeholders.js");

describe("placeholders", () => {
  it("skips think-time under node:test", () => {
    assert.equal(thinkMs(), 0);
  });

  it("asks the next placeholder question", async () => {
    const first = await placeholderNextQuestion([], [
      { question: "", answer: "פתיחה" },
    ]);
    assert.deepEqual(first, {
      question: PLACEHOLDER_QUESTIONS[0],
      done: false,
    });

    const turns: Turn[] = [
      { question: "", answer: "פתיחה" },
      { question: PLACEHOLDER_QUESTIONS[0], answer: "תשובה" },
    ];
    const second = await placeholderNextQuestion([], turns);
    assert.deepEqual(second, {
      question: PLACEHOLDER_QUESTIONS[1],
      done: false,
    });
  });

  it("stops after the last placeholder question", async () => {
    const turns: Turn[] = [
      { question: "", answer: "a" },
      { question: PLACEHOLDER_QUESTIONS[0], answer: "b" },
      { question: PLACEHOLDER_QUESTIONS[1], answer: "c" },
      { question: PLACEHOLDER_QUESTIONS[2], answer: "d" },
    ];
    const done = await placeholderNextQuestion([], turns);
    assert.deepEqual(done, { question: "", done: true });
  });

  it("writes a placeholder draft honoring type and tone", async () => {
    const article = await placeholderWriteArticle({
      facts: [],
      turns: [{ question: "", answer: "פתיחה" }],
      type: "news",
      tone: "factual",
    });
    assert.equal(article.headline, PLACEHOLDER_ARTICLE.headline);
    assert.equal(article.standfirst, PLACEHOLDER_ARTICLE.standfirst);
    assert.deepEqual(article.paragraphs, [...PLACEHOLDER_ARTICLE.paragraphs]);
    assert.equal(article.type, "news");
    assert.equal(article.tone, "factual");
  });

  it("llmFns swaps in placeholders only when testMode", () => {
    const nextQuestion = async () => ({ question: "real", done: false });
    const writeArticle = async () => {
      throw new Error("real write");
    };
    const live = llmFns(false, { nextQuestion, writeArticle });
    assert.equal(live.nextQuestion, nextQuestion);
    const test = llmFns(true, { nextQuestion, writeArticle });
    assert.equal(test.nextQuestion, placeholderNextQuestion);
    assert.equal(test.writeArticle, placeholderWriteArticle);
  });

  it("blocks placeholders when NODE_ENV is production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      assert.equal(allowTestMode(), false);
      const nextQuestion = async () => ({ question: "real", done: false });
      const writeArticle = async () => {
        throw new Error("real write");
      };
      const fns = llmFns(true, { nextQuestion, writeArticle });
      assert.equal(fns.nextQuestion, nextQuestion);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
