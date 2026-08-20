import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  ERROR_EMPTY_MESSAGE,
  ERROR_INTERVIEW_CLOSED,
  ERROR_INTERVIEW_NOT_FOUND,
  ERROR_INVALID_FORM,
  ERROR_NO_OPEN_INTERVIEW,
  ERROR_NO_TRANSCRIPT,
  ERROR_RATE_LIMIT,
  ERROR_STATUS,
  ERROR_UNAUTHORIZED,
} from "../contract.js";
import { MAX_MESSAGES, TONE_LABELS, TYPE_LABELS, type ArticleTypeId, type ToneId } from "../types.js";
import { cookieOf, coreGetUserId, coreSaveInterview } from "./core.js";
import { clientIp, rateLimit } from "./rateLimit.js";
import { allowTestMode, llmFns } from "./placeholders.js";
import { closeWithDraft, jsonError, persistAfter, readerCount } from "./run.js";
import { useHttpLogging } from "../log/http.js";
import { sseJson } from "./sse.js";
import {
  buildTurns,
  clearSession,
  createSession,
  getCurrentSession,
  newMessage,
  parseBrief,
  toWireSession,
} from "./session.js";
import type {
  GetUserIdFn,
  NextQuestionFn,
  ProposeKartesetFn,
  SaveInterviewFn,
  SectionId,
  WriteArticleFn,
} from "./types.js";

const DEFAULT_ORIGIN = "http://localhost:5173";

export type AppDeps = {
  nextQuestion?: NextQuestionFn;
  writeArticle?: WriteArticleFn;
  proposeKarteset?: ProposeKartesetFn;
  getUserId?: GetUserIdFn;
  saveInterview?: SaveInterviewFn;
};

type AppEnv = { Variables: { userId: string } };

const TYPE_IDS = new Set(Object.keys(TYPE_LABELS));
const TONE_IDS = new Set(Object.keys(TONE_LABELS));

async function resolveDeps(deps?: AppDeps): Promise<Required<AppDeps>> {
  const nextQuestion =
    deps?.nextQuestion ??
    (await import("../interviewer/interviewer.js")).nextQuestion;
  const writeArticle =
    deps?.writeArticle ?? (await import("../writer/writer.js")).writeArticle;
  const proposeKarteset =
    deps?.proposeKarteset ?? (await import("../karteset/propose.js")).proposeKarteset;
  return {
    nextQuestion,
    writeArticle,
    proposeKarteset,
    getUserId: deps?.getUserId ?? coreGetUserId,
    saveInterview: deps?.saveInterview ?? coreSaveInterview,
  };
}

function sessionNotFound() {
  return jsonError(ERROR_INTERVIEW_NOT_FOUND, ERROR_STATUS.interviewNotFound);
}

function parseFormId(
  value: unknown,
  ids: Set<string>,
): { ok: true; value: string | null } | { ok: false } {
  if (value === null) return { ok: true, value: null };
  if (typeof value === "string" && ids.has(value)) return { ok: true, value };
  return { ok: false };
}

function requireCurrent(userId: string, id?: string) {
  const state = getCurrentSession(userId);
  if (!state) {
    return { error: jsonError(ERROR_NO_OPEN_INTERVIEW, ERROR_STATUS.noOpenInterview) };
  }
  if (id && state.id !== id) {
    return { error: sessionNotFound() };
  }
  return { state };
}

export function createApp(deps?: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  let resolved: Required<AppDeps> | null = null;

  const getDeps = async () => {
    if (!resolved) resolved = await resolveDeps(deps);
    return resolved;
  };

  app.use(
    "*",
    cors({
      origin: (process.env.FRONTEND_ORIGIN || DEFAULT_ORIGIN)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      credentials: true,
    }),
  );
  useHttpLogging(app);

  app.use(
    "*",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 60,
      message: ERROR_RATE_LIMIT,
      key: (c) => `ip:${clientIp(c)}`,
      skip: (c) => {
        const path = c.req.path;
        return (
          path === "/health" ||
          (c.req.method === "POST" && (path.endsWith("/messages") || path.endsWith("/draft")))
        );
      },
    }),
  );

  app.use("*", async (c, next) => {
    if (c.req.path === "/health") return next();
    const { getUserId } = await getDeps();
    const userId = await getUserId(cookieOf(c));
    if (!userId) return jsonError(ERROR_UNAUTHORIZED, ERROR_STATUS.unauthorized);
    c.set("userId", userId);
    await next();
  });

  app.use(
    "*",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 30,
      message: ERROR_RATE_LIMIT,
      key: (c) => `llm:${c.get("userId") ?? clientIp(c)}`,
      skip: (c) => {
        const path = c.req.path;
        return !(c.req.method === "POST" && (path.endsWith("/messages") || path.endsWith("/draft")));
      },
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/interviews", (c) => {
    const state = getCurrentSession(c.get("userId"));
    if (!state) return c.body(null, 204);
    return c.json(toWireSession(state));
  });

  app.post("/interviews", async (c) => {
    const body = (await c.req.json()) as {
      brief?: unknown;
      facts?: unknown;
      subjectName?: string;
      testMode?: boolean;
    };
    const brief = parseBrief(body);
    const state = createSession(
      c.get("userId"),
      brief,
      body.testMode === true && allowTestMode(),
    );
    return c.json(toWireSession(state), 200);
  });

  app.get("/interviews/:id", (c) => {
    const { error, state } = requireCurrent(c.get("userId"), c.req.param("id"));
    if (error) return error;
    return c.json(toWireSession(state!));
  });

  app.post("/interviews/:id/messages", async (c) => {
    const id = c.req.param("id");
    const { error, state } = requireCurrent(c.get("userId"), id);
    if (error) return error;

    const body = (await c.req.json()) as { text?: string };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return jsonError(ERROR_EMPTY_MESSAGE, ERROR_STATUS.emptyMessage);
    }

    if (state!.exhausted) {
      return jsonError(ERROR_INTERVIEW_CLOSED, ERROR_STATUS.interviewClosed);
    }

    const deps = await getDeps();
    const { nextQuestion, writeArticle, proposeKarteset } = llmFns(state!.testMode, deps);
    const cookie = cookieOf(c);
    const charged = await deps.saveInterview(cookie, toWireSession(state!));
    if (!charged.ok) return jsonError(charged.message, charged.status);

    return sseJson(async () => {
      state!.messages.push(newMessage("reader", text));
      state!.turns = buildTurns(state!.messages);

      if (readerCount(state!) >= MAX_MESSAGES) {
        await closeWithDraft(state!, writeArticle, proposeKarteset);
        await persistAfter(deps.saveInterview, cookie, state!);
        return toWireSession(state!);
      }

      const result = await nextQuestion(state!.brief, state!.turns);
      if (result.question) {
        state!.messages.push(newMessage("reporter", result.question));
      }

      if (result.done && !result.question) {
        await closeWithDraft(state!, writeArticle, proposeKarteset);
      }

      await persistAfter(deps.saveInterview, cookie, state!);
      return toWireSession(state!);
    });
  });

  app.post("/interviews/:id/draft", async (c) => {
    const id = c.req.param("id");
    const { error, state } = requireCurrent(c.get("userId"), id);
    if (error) return error;

    if (readerCount(state!) === 0) {
      return jsonError(ERROR_NO_TRANSCRIPT, ERROR_STATUS.noTranscript);
    }

    const deps = await getDeps();
    const { writeArticle, proposeKarteset } = llmFns(state!.testMode, deps);
    const cookie = cookieOf(c);
    const charged = await deps.saveInterview(cookie, toWireSession(state!));
    if (!charged.ok) return jsonError(charged.message, charged.status);

    return sseJson(async () => {
      await closeWithDraft(state!, writeArticle, proposeKarteset);
      await persistAfter(deps.saveInterview, cookie, state!);
      return toWireSession(state!);
    });
  });

  app.patch("/interviews/:id/draft/section", async (c) => {
    const id = c.req.param("id");
    const { error, state } = requireCurrent(c.get("userId"), id);
    if (error) return error;

    const body = (await c.req.json()) as { section?: SectionId };
    if (body.section) state!.draft.section = body.section;
    return c.json(toWireSession(state!));
  });

  app.patch("/interviews/:id/form", async (c) => {
    const id = c.req.param("id");
    const { error, state } = requireCurrent(c.get("userId"), id);
    if (error) return error;

    if (state!.exhausted) {
      return jsonError(ERROR_INTERVIEW_CLOSED, ERROR_STATUS.interviewClosed);
    }

    const body = (await c.req.json()) as {
      type?: ArticleTypeId | null;
      tone?: ToneId | null;
    };

    if ("type" in body) {
      const parsed = parseFormId(body.type, TYPE_IDS);
      if (!parsed.ok) {
        return jsonError(ERROR_INVALID_FORM, ERROR_STATUS.invalidForm);
      }
      state!.type = parsed.value as ArticleTypeId | null;
    }
    if ("tone" in body) {
      const parsed = parseFormId(body.tone, TONE_IDS);
      if (!parsed.ok) {
        return jsonError(ERROR_INVALID_FORM, ERROR_STATUS.invalidForm);
      }
      state!.tone = parsed.value as ToneId | null;
    }

    return c.json(toWireSession(state!));
  });

  app.delete("/interviews/:id", (c) => {
    const userId = c.get("userId");
    const { error } = requireCurrent(userId, c.req.param("id"));
    if (error) return error;
    clearSession(userId);
    return c.body(null, 204);
  });

  return app;
}
