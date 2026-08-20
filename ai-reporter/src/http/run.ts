import { getLogger } from "../log/logger.js";
import type { Article } from "../types.js";
import type {
  ProposeKartesetFn,
  SaveInterviewFn,
  SectionId,
  SessionState,
  WriteArticleFn,
} from "./types.js";
import { toWireSession } from "./session.js";

export function jsonError(message: string, status: number) {
  return Response.json({ message }, { status });
}

export function articleToDraft(article: Article, draftId: string) {
  return {
    id: draftId,
    status: "ready" as const,
    angle: article.angle,
    headline: article.headline,
    standfirst: article.standfirst,
    paragraphs: article.paragraphs,
    pendingParagraph: null,
    checks: [] as { label: string; done: boolean }[],
    section: null as SectionId | null,
  };
}

export function readerCount(state: SessionState): number {
  return state.messages.filter((m) => m.role === "reader").length;
}

export async function closeWithDraft(
  state: SessionState,
  writeArticle: WriteArticleFn,
  proposeKarteset: ProposeKartesetFn,
) {
  state.exhausted = true;
  const article = await writeArticle({
    brief: state.brief,
    turns: state.turns,
    ...(state.type ? { type: state.type } : {}),
    ...(state.tone ? { tone: state.tone } : {}),
  });
  state.draft = articleToDraft(article, state.draft.id);
  state.angleChosen = true;
  state.type = article.type;
  state.tone = article.tone;
  state.proposedFacts = await proposeKarteset(state.brief.facts, state.turns);
}

export async function persistAfter(
  saveInterview: SaveInterviewFn,
  cookie: string,
  state: SessionState,
) {
  try {
    const saved = await saveInterview(cookie, toWireSession(state));
    if (!saved.ok) {
      getLogger().warn(
        { event: "interview.save_failed", status: saved.status },
        "archive upsert failed",
      );
    }
  } catch (err) {
    getLogger().warn({ event: "interview.save_failed", err }, "archive upsert failed");
  }
}
