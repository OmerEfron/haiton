import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  ERROR_EMPTY_MESSAGE,
  ERROR_INTERVIEW_NOT_FOUND,
  ERROR_NO_OPEN_INTERVIEW,
  ERROR_STATUS,
} from "../contract.js";
import { resetCallCount } from "../llm.js";
import type { Article, FactInput } from "../types.js";
import {
  buildTurns,
  clearSession,
  createSession,
  getCurrentSession,
  newMessage,
  toWireSession,
} from "./session.js";
import type { NextQuestionFn, SectionId, WriteArticleFn } from "./types.js";

const DEFAULT_ORIGIN = "http://localhost:5173";

export type AppDeps = {
  nextQuestion?: NextQuestionFn;
  writeArticle?: WriteArticleFn;
};

function jsonError(message: string, status: number) {
  return Response.json({ message }, { status });
}

function articleToDraft(article: Article, draftId: string) {
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

async function resolveDeps(deps?: AppDeps): Promise<Required<AppDeps>> {
  const nextQuestion =
    deps?.nextQuestion ??
    (await import("../interviewer/interviewer.js")).nextQuestion;
  const writeArticle =
    deps?.writeArticle ?? (await import("../writer/writer.js")).writeArticle;
  return { nextQuestion, writeArticle };
}

function sessionNotFound() {
  return jsonError(ERROR_INTERVIEW_NOT_FOUND, ERROR_STATUS.interviewNotFound);
}

function requireCurrent(id?: string) {
  const state = getCurrentSession();
  if (!state) {
    return { error: jsonError(ERROR_NO_OPEN_INTERVIEW, ERROR_STATUS.noOpenInterview) };
  }
  if (id && state.id !== id) {
    return { error: sessionNotFound() };
  }
  return { state };
}

export function createApp(deps?: AppDeps): Hono {
  const app = new Hono();
  let resolved: Required<AppDeps> | null = null;

  const getDeps = async () => {
    if (!resolved) resolved = await resolveDeps(deps);
    return resolved;
  };

  app.use(
    "*",
    cors({
      origin: process.env.FRONTEND_ORIGIN?.trim() || DEFAULT_ORIGIN,
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/interviews", (c) => {
    const state = getCurrentSession();
    if (!state) return c.body(null, 204);
    return c.json(toWireSession(state));
  });

  app.post("/interviews", async (c) => {
    const body = (await c.req.json()) as { facts?: FactInput[] };
    const facts = Array.isArray(body.facts) ? body.facts : [];
    const state = createSession(facts);
    return c.json(toWireSession(state), 200);
  });

  app.get("/interviews/:id", (c) => {
    const { error, state } = requireCurrent(c.req.param("id"));
    if (error) return error;
    return c.json(toWireSession(state!));
  });

  app.post("/interviews/:id/messages", async (c) => {
    const id = c.req.param("id");
    const { error, state } = requireCurrent(id);
    if (error) return error;

    const body = (await c.req.json()) as { text?: string };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return jsonError(ERROR_EMPTY_MESSAGE, ERROR_STATUS.emptyMessage);
    }

    const { nextQuestion, writeArticle } = await getDeps();
    state!.messages.push(newMessage("reader", text));
    state!.turns = buildTurns(state!.messages);

    const result = await nextQuestion(state!.facts, state!.turns);
    if (result.question) {
      state!.messages.push(newMessage("reporter", result.question));
    }

    if (result.done && !result.question) {
      state!.exhausted = true;
      resetCallCount();
      const article = await writeArticle({
        facts: state!.facts,
        turns: state!.turns,
      });
      state!.draft = articleToDraft(article, state!.draft.id);
      state!.angleChosen = true;
    }

    return c.json(toWireSession(state!));
  });

  app.post("/interviews/:id/draft", async (c) => {
    const id = c.req.param("id");
    const { error, state } = requireCurrent(id);
    if (error) return error;

    const { writeArticle } = await getDeps();
    resetCallCount();
    const article = await writeArticle({
      facts: state!.facts,
      turns: state!.turns,
    });
    state!.draft = articleToDraft(article, state!.draft.id);
    state!.angleChosen = true;
    return c.json(toWireSession(state!));
  });

  app.patch("/interviews/:id/draft/section", async (c) => {
    const id = c.req.param("id");
    const { error, state } = requireCurrent(id);
    if (error) return error;

    const body = (await c.req.json()) as { section?: SectionId };
    if (body.section) state!.draft.section = body.section;
    return c.json(toWireSession(state!));
  });

  app.delete("/interviews/:id", (c) => {
    const { error } = requireCurrent(c.req.param("id"));
    if (error) return error;
    clearSession();
    return c.body(null, 204);
  });

  return app;
}
