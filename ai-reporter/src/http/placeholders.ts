import {
  askedCount,
  DEFAULT_TONE,
  DEFAULT_TYPE,
  MAX_MESSAGES,
  type Article,
  type PersonBrief,
  type ProposedFact,
  type NextQuestion,
  type Turn,
} from "../types.js";
import type { NextQuestionFn, ProposeKartesetFn, WriteArticleFn } from "./types.js";

export const PLACEHOLDER_QUESTIONS = [
  "מה בדיוק קרה אחר כך?",
  "מי היה שם, ומה הם אמרו?",
  "מה עומד לקרות עכשיו?",
] as const;

export const PLACEHOLDER_ARTICLE = {
  angle: "זווית בדיקה",
  headline: "טיוטת בדיקה",
  standfirst: "ידיעה זו נוצרה במצב בדיקה, בלי קריאה לכתב.",
  paragraphs: [
    "זו טיוטת דמה. המסך מתנהג כרגיל — בלי מודל.",
    "אפשר לערוך, לשמור או לפרסם כדי לבדוק את שולחן העורכים.",
  ],
} as const;

export const PLACEHOLDER_PROPOSED: ProposedFact[] = [
  { text: "עובד בחברת בדיקה", category: "work" },
];

const THINK_MIN_MS = 500;
const THINK_SPAN_MS = 4500;

export function thinkMs(): number {
  if (process.env.NODE_TEST_CONTEXT) return 0;
  return THINK_MIN_MS + Math.random() * THINK_SPAN_MS;
}

async function pause(): Promise<void> {
  const ms = thinkMs();
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function placeholderNextQuestion(
  _brief: PersonBrief,
  turns: Turn[],
): Promise<NextQuestion> {
  await pause();
  if (turns.length >= MAX_MESSAGES) return { question: "", done: true };
  const question = PLACEHOLDER_QUESTIONS[askedCount(turns)];
  if (!question) return { question: "", done: true };
  return { question, done: false };
}

export async function placeholderWriteArticle(input: {
  brief: PersonBrief;
  turns: Turn[];
  tone?: Article["tone"];
  type?: Article["type"];
}): Promise<Article> {
  await pause();
  return {
    angle: PLACEHOLDER_ARTICLE.angle,
    headline: PLACEHOLDER_ARTICLE.headline,
    standfirst: PLACEHOLDER_ARTICLE.standfirst,
    paragraphs: [...PLACEHOLDER_ARTICLE.paragraphs],
    tone: input.tone ?? DEFAULT_TONE,
    type: input.type ?? DEFAULT_TYPE,
  };
}

export async function placeholderProposeKarteset(): Promise<ProposedFact[]> {
  return [...PLACEHOLDER_PROPOSED];
}

export function allowTestMode(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function llmFns(
  testMode: boolean,
  deps: {
    nextQuestion: NextQuestionFn;
    writeArticle: WriteArticleFn;
    proposeKarteset: ProposeKartesetFn;
  },
): {
  nextQuestion: NextQuestionFn;
  writeArticle: WriteArticleFn;
  proposeKarteset: ProposeKartesetFn;
} {
  if (!testMode || !allowTestMode()) {
    return {
      nextQuestion: deps.nextQuestion,
      writeArticle: deps.writeArticle,
      proposeKarteset: deps.proposeKarteset,
    };
  }
  return {
    nextQuestion: placeholderNextQuestion,
    writeArticle: placeholderWriteArticle,
    proposeKarteset: placeholderProposeKarteset,
  };
}
