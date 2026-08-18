/* REPORTER AGENT API — the interviewing / story-writing service.
 * Separate deployment from the core API; wired via VITE_REPORTER_URL. */

import type { InterviewSession, SectionId, ArticleTypeId, ToneId } from "../types";
import { ApiError } from "../client";
import { listFacts } from "../core/karteset";
import { reporterRequest } from "./fetch";

export async function startSession(subjectName?: string): Promise<InterviewSession> {
  const existing = await reporterRequest<InterviewSession | undefined>("/interviews");
  if (existing) return existing;

  const facts = await listFacts();
  const name = subjectName?.trim();
  return reporterRequest<InterviewSession>("/interviews", {
    method: "POST",
    body: JSON.stringify({
      facts,
      ...(name ? { subjectName: name } : {}),
    }),
  });
}

export async function getSession(): Promise<InterviewSession | null> {
  const session = await reporterRequest<InterviewSession | undefined>("/interviews");
  return session ?? null;
}

/** Sends a reader turn and resolves once the reporter has answered. */
export async function sendMessage(text: string): Promise<InterviewSession> {
  const session = await getSession();
  if (!session) throw new ApiError("אין ראיון פתוח", 409);
  if (session.exhausted) throw new ApiError("הראיון הסתיים", 409);
  if (!text.trim()) throw new ApiError("אי אפשר לשלוח הודעה ריקה");

  return reporterRequest<InterviewSession>(`/interviews/${session.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text: text.trim() }),
  });
}

/** "נסחו טיוטה" — skip ahead and write the story out in full. */
export async function requestDraft(): Promise<InterviewSession> {
  const session = await getSession();
  if (!session) throw new ApiError("אין ראיון פתוח", 409);

  return reporterRequest<InterviewSession>(`/interviews/${session.id}/draft`, {
    method: "POST",
  });
}

/** Editorial choice the reader makes on the draft, not the agent. */
export async function setDraftSection(section: SectionId): Promise<InterviewSession> {
  const session = await getSession();
  if (!session) throw new ApiError("אין ראיון פתוח", 409);

  return reporterRequest<InterviewSession>(`/interviews/${session.id}/draft/section`, {
    method: "PATCH",
    body: JSON.stringify({ section }),
  });
}

export async function setArticleForm(patch: {
  type?: ArticleTypeId | null;
  tone?: ToneId | null;
}): Promise<InterviewSession> {
  const session = await getSession();
  if (!session) throw new ApiError("אין ראיון פתוח", 409);
  if (session.exhausted) throw new ApiError("הראיון הסתיים", 409);

  return reporterRequest<InterviewSession>(`/interviews/${session.id}/form`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function discardSession(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await reporterRequest<void>(`/interviews/${session.id}`, { method: "DELETE" });
}
