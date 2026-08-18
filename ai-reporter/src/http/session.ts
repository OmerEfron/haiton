import { randomUUID } from "node:crypto";
import { SESSION_OPENERS } from "../contract.js";
import type { FactInput, Turn } from "../types.js";
import type { Draft, InterviewMessage, InterviewSession, SessionState } from "./types.js";

let current: SessionState | null = null;

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

export function getCurrentSession(): SessionState | null {
  return current;
}

export function clearSession(): void {
  current = null;
}

export function createSession(facts: FactInput[]): SessionState {
  const session: InterviewSession = {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    elapsedLabel: "0 דק'",
    factsLocked: facts.length,
    angleChosen: false,
    messages: [],
    reporterTyping: false,
    draft: emptyDraft(),
    openers: [...SESSION_OPENERS],
    exhausted: false,
  };
  current = { ...session, facts, turns: [] };
  return current;
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
  const { facts: _facts, turns: _turns, ...session } = state;
  return session;
}
