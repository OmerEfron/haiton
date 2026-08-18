/* REPORTER AGENT API — the interviewing / story-writing service.
 * This is a separate deployment from the core API.
 * Later: POST /interviews, GET /interviews/:id, POST /interviews/:id/messages,
 *        POST /interviews/:id/draft — most likely streaming, which is why
 *        `reporterTyping` and `draft.pendingParagraph` already exist on the
 *        session shape: the UI is built to render a partially-written story. */

import type { Draft, InterviewMessage, InterviewSession, SectionId } from "../types";
import { ApiError, clone, delay, nextId } from "../client";
import { db } from "../../mocks/db";
import {
  afterScript,
  beats,
  openers,
  openingCold,
  openingWithBackground,
} from "../../mocks/fixtures/interview-script";

const emptyDraft: Draft = {
  id: "d1",
  status: "empty",
  angle: null,
  headline: null,
  standfirst: null,
  paragraphs: [],
  pendingParagraph: null,
  checks: [],
  section: null,
};

function clock(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function message(role: InterviewMessage["role"], text: string, suggestions?: string[]): InterviewMessage {
  return { id: nextId("m"), role, text, suggestions, at: clock() };
}

export async function startSession(): Promise<InterviewSession> {
  await delay(300);
  if (db.interview) return clone(db.interview);

  // A cold karteset gets the first-interview opener from mockup 1f.
  const cold = db.facts.length === 0;
  db.interviewBeat = 0;
  db.interview = {
    id: nextId("iv"),
    startedAt: clock(),
    elapsedLabel: "0 דקות",
    factsLocked: 0,
    angleChosen: false,
    messages: [message("reporter", cold ? openingCold : openingWithBackground)],
    reporterTyping: false,
    draft: structuredClone(emptyDraft),
    openers,
    exhausted: false,
  };
  return clone(db.interview);
}

export async function getSession(): Promise<InterviewSession | null> {
  await delay(120);
  return db.interview ? clone(db.interview) : null;
}

/** Sends a reader turn and resolves once the reporter has answered.
 *  The caller re-renders the typing indicator from `reporterTyping` in between. */
export async function sendMessage(text: string): Promise<InterviewSession> {
  const session = db.interview;
  if (!session) throw new ApiError("אין ראיון פתוח", 409);
  if (!text.trim()) throw new ApiError("אי אפשר לשלוח הודעה ריקה");

  session.messages.push(message("reader", text.trim()));
  session.reporterTyping = true;
  await delay(160);

  const beat = beats[db.interviewBeat];
  await delay(beat ? beat.typingMs : 700);

  if (!beat) {
    session.messages.push(message("reporter", afterScript));
    session.reporterTyping = false;
    session.exhausted = true;
    return clone(session);
  }

  db.interviewBeat += 1;
  session.messages.push(message("reporter", beat.reporter.text, beat.reporter.suggestions));
  session.factsLocked = beat.factsLocked;
  session.angleChosen = beat.angleChosen;
  session.draft = { ...session.draft, ...beat.draft };
  session.elapsedLabel = `${db.interviewBeat * 2} דקות`;
  session.reporterTyping = false;
  db.profile.stats.draftsInProgress = session.draft.status === "empty" ? 0 : 1;

  return clone(session);
}

/** "נסחו טיוטה" — skip ahead and write the story out in full. */
export async function requestDraft(): Promise<InterviewSession> {
  const session = db.interview;
  if (!session) throw new ApiError("אין ראיון פתוח", 409);

  session.reporterTyping = true;
  await delay(1200);

  const last = beats[beats.length - 1];
  for (let i = db.interviewBeat; i < beats.length; i += 1) {
    session.draft = { ...session.draft, ...beats[i].draft };
  }
  db.interviewBeat = beats.length;
  session.factsLocked = last.factsLocked;
  session.angleChosen = true;
  session.draft.status = "ready";
  session.reporterTyping = false;
  session.messages.push(message("reporter", last.reporter.text));
  db.profile.stats.draftsInProgress = 1;

  return clone(session);
}

/** Editorial choice the reader makes on the draft, not the agent. */
export async function setDraftSection(section: SectionId): Promise<InterviewSession> {
  await delay(140);
  const session = db.interview;
  if (!session) throw new ApiError("אין ראיון פתוח", 409);
  session.draft.section = section;
  return clone(session);
}

export async function discardSession(): Promise<void> {
  await delay(200);
  db.interview = null;
  db.interviewBeat = 0;
  db.profile.stats.draftsInProgress = 0;
}
