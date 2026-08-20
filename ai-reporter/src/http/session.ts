import { randomUUID } from "node:crypto";
import { SESSION_OPENERS } from "../contract.js";
import {
  briefFromFacts,
  type FactInput,
  type PersonBrief,
  type Turn,
} from "../types.js";
import type { Draft, InterviewMessage, InterviewSession, LockedFact, SessionState } from "./types.js";

const sessions = new Map<string, SessionState>();

function emptyDraft(): Draft {
  return {
    id: randomUUID(),
    status: "empty",
    angle: null,
    headline: null,
    standfirst: null,
    paragraphs: [],
    pendingParagraph: null,
    checks: [],
    section: null,
  };
}

function slimFacts(facts: FactInput[]): LockedFact[] {
  return facts.map((f) => ({ id: f.id, category: f.category, text: f.text }));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseBrief(body: {
  brief?: unknown;
  facts?: unknown;
  subjectName?: unknown;
}): PersonBrief {
  if (body.brief && typeof body.brief === "object") {
    const raw = body.brief as PersonBrief;
    const subject = raw.subject && typeof raw.subject === "object" ? raw.subject : { name: "" };
    const parsed: PersonBrief = {
      subject: { name: asString(subject.name) },
      facts: Array.isArray(raw.facts) ? raw.facts : [],
      circle: Array.isArray(raw.circle) ? raw.circle : [],
      recent: Array.isArray(raw.recent) ? raw.recent : [],
    };
    if (typeof subject.city === "string" && subject.city) parsed.subject.city = subject.city;
    if (typeof subject.age === "number") parsed.subject.age = subject.age;
    if (typeof subject.headline === "string" && subject.headline) {
      parsed.subject.headline = subject.headline;
    }
    return parsed;
  }
  const facts = Array.isArray(body.facts) ? (body.facts as FactInput[]) : [];
  const name = typeof body.subjectName === "string" ? body.subjectName : undefined;
  return briefFromFacts(facts, name);
}

export function getCurrentSession(userId: string): SessionState | null {
  return sessions.get(userId) ?? null;
}

export function clearSession(userId?: string): void {
  if (userId) sessions.delete(userId);
  else sessions.clear();
}

export function createSession(
  userId: string,
  brief: PersonBrief,
  testMode = false,
): SessionState {
  const session: InterviewSession = {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    elapsedLabel: "0 דק'",
    factsLocked: brief.facts.length,
    angleChosen: false,
    messages: [],
    reporterTyping: false,
    draft: emptyDraft(),
    openers: [...SESSION_OPENERS],
    exhausted: false,
    type: null,
    tone: null,
    testMode,
    facts: slimFacts(brief.facts),
    proposedFacts: [],
  };
  const state: SessionState = { ...session, brief, turns: [] };
  sessions.set(userId, state);
  return state;
}

export function newMessage(role: InterviewMessage["role"], text: string): InterviewMessage {
  return { id: randomUUID(), role, text, at: new Date().toISOString() };
}

export function buildTurns(messages: InterviewMessage[]): Turn[] {
  const turns: Turn[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== "reader") continue;
    if (turns.length === 0) {
      turns.push({ question: "", answer: msg.text });
      continue;
    }
    const prior = messages[i - 1];
    if (prior?.role === "reporter") {
      turns.push({ question: prior.text, answer: msg.text });
    }
  }
  return turns;
}

export function toWireSession(state: SessionState): InterviewSession {
  const { brief, turns: _turns, ...session } = state;
  return {
    ...session,
    facts: slimFacts(brief.facts),
    factsLocked: brief.facts.length,
  };
}
