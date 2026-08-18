import { resetCallCount, getCallCount } from "./llm.js";
import { nextQuestion } from "./interviewer/interviewer.js";
import type {
  Article,
  ArticleTypeId,
  FactInput,
  ToneId,
  Turn,
} from "./types.js";
import { MAX_QUESTIONS, askedCount } from "./types.js";
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

  const opening = answers[0]?.trim();
  if (!opening) {
    throw new Error("answers[0] is required as the user's opening report");
  }

  const questions: string[] = [];
  const turns: Turn[] = [{ question: "", answer: opening }];
  let answerIdx = 1;

  while (true) {
    const result = await nextQuestion(facts, turns);

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

    if (askedCount(turns) >= MAX_QUESTIONS) {
      break;
    }
  }

  const interviewerCalls = getCallCount();
  resetCallCount();

  const article = await writeArticle({ facts, turns, tone, type });

  return {
    questions,
    article,
    llmCalls: interviewerCalls + getCallCount(),
  };
}
