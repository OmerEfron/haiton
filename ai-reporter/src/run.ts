import { resetCallCount, getCallCount } from "./llm.js";
import { nextQuestion } from "./interviewer/interviewer.js";
import type {
  Article,
  ArticleTypeId,
  FactInput,
  ToneId,
  Turn,
} from "./types.js";
import { briefFromFacts, MAX_MESSAGES } from "./types.js";
import { writeArticle } from "./writer/writer.js";

type RunReporterInput = {
  facts: FactInput[];
  answers: string[];
  tone: ToneId;
  type: ArticleTypeId;
};

type RunReporterResult = {
  questions: string[];
  article: Article;
  llmCalls: number;
};

export async function runReporter({
  facts,
  answers,
  tone,
  type,
}: RunReporterInput): Promise<RunReporterResult> {
  resetCallCount();

  const brief = briefFromFacts(facts);
  const opening = answers[0]?.trim();
  if (!opening) {
    throw new Error("answers[0] is required as the user's opening report");
  }

  const questions: string[] = [];
  const turns: Turn[] = [{ question: "", answer: opening }];
  let answerIdx = 1;

  while (true) {
    const result = await nextQuestion(brief, turns);

    if (result.done && !result.question) {
      break;
    }

    questions.push(result.question);

    if (result.done) {
      break;
    }

    if (answerIdx >= answers.length) {
      break;
    }

    turns.push({
      question: result.question,
      answer: answers[answerIdx]!,
    });
    answerIdx += 1;

    if (turns.length >= MAX_MESSAGES) {
      break;
    }
  }

  const article = await writeArticle({ brief, turns, tone, type });

  return {
    questions,
    article,
    llmCalls: getCallCount(),
  };
}
