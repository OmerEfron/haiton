import type { PersonBrief, ProposedFact, Turn } from "../types.js";

export type SectionId =
  | "work"
  | "family"
  | "friends"
  | "celebrations"
  | "food"
  | "moments"
  | "flashes";

export type InterviewRole = "reporter" | "reader";

export interface InterviewMessage {
  id: string;
  role: InterviewRole;
  text: string;
  suggestions?: string[];
  at: string;
}

export interface DraftChecks {
  label: string;
  done: boolean;
}

export interface Draft {
  id: string;
  status: "empty" | "writing" | "ready";
  angle: string | null;
  headline: string | null;
  standfirst: string | null;
  paragraphs: string[];
  pendingParagraph: string | null;
  checks: DraftChecks[];
  section: SectionId | null;
}

export interface LockedFact {
  id: string;
  category: string;
  text: string;
}

export interface InterviewSession {
  id: string;
  startedAt: string;
  elapsedLabel: string;
  factsLocked: number;
  angleChosen: boolean;
  messages: InterviewMessage[];
  reporterTyping: boolean;
  draft: Draft;
  openers: string[];
  exhausted: boolean;
  /** null = Auto. Filled with the resolved id after the draft is written. */
  type: import("../types.js").ArticleTypeId | null;
  /** null = Auto. Filled with the resolved id after the draft is written. */
  tone: import("../types.js").ToneId | null;
  /** Skip the real LLM; placeholder questions and drafts with a think delay. */
  testMode: boolean;
  facts: LockedFact[];
  proposedFacts: ProposedFact[];
}

export type SessionState = InterviewSession & {
  brief: PersonBrief;
  turns: Turn[];
};

export type WriteArticleFn = (input: {
  brief: PersonBrief;
  turns: Turn[];
  tone?: import("../types.js").ToneId;
  type?: import("../types.js").ArticleTypeId;
}) => Promise<import("../types.js").Article>;

export type NextQuestionFn = (
  brief: PersonBrief,
  turns: Turn[],
) => Promise<import("../types.js").NextQuestion>;

export type ProposeKartesetFn = (
  facts: PersonBrief["facts"],
  turns: Turn[],
) => Promise<ProposedFact[]>;

export type GetUserIdFn = (cookie: string) => Promise<string | null>;

export type SaveInterviewResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export type SaveInterviewFn = (
  cookie: string,
  session: InterviewSession,
) => Promise<SaveInterviewResult>;
