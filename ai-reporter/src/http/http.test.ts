import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it, beforeEach } from "node:test";
import type { Article, NextQuestion, Turn } from "../types.js";
import type { InterviewSession } from "./types.js";

register("./hook.mjs", import.meta.url);

const {
  ERROR_EMPTY_MESSAGE,
  ERROR_INTERVIEW_CLOSED,
  ERROR_INTERVIEW_NOT_FOUND,
  ERROR_INVALID_FORM,
  ERROR_LLM,
  ERROR_NO_OPEN_INTERVIEW,
  ERROR_NO_TRANSCRIPT,
  ERROR_STATUS,
} = await import("../contract.js");
const { createApp } = await import("./app.js");
const { clearSession } = await import("./session.js");
const { parseSseJson } = await import("./sse.js");

function sseSession(text: string) {
  return parseSseJson<InterviewSession>(text);
}

const FACTS = [
  { id: "f1", category: "work", text: "מפתח בחיפה", usedInStories: 0 },
];

function fakeDeps() {
  let call = 0;
  const turnsSeen: Turn[][] = [];

  const nextQuestion = async (_facts: unknown, turns: Turn[]): Promise<NextQuestion> => {
    turnsSeen.push([...turns]);
    call += 1;
    if (call === 1) {
      assert.equal(turns.length, 1);
      assert.equal(turns[0].question, "");
      return { question: "מה אמרת במשוב?", done: false };
    }
    if (call === 2) {
      assert.equal(turns.length, 2);
      assert.equal(turns[0].question, "");
      assert.equal(turns[1].question, "מה אמרת במשוב?");
      return { question: "", done: true };
    }
    return { question: "", done: true };
  };

  const writeArticle = async (): Promise<Article> => ({
    angle: "זווית",
    headline: "כותרת בדיקה",
    standfirst: "כותרת משנה",
    paragraphs: ["פסקה"],
    tone: "intimate",
    type: "feature",
  });

  const getUserId = async (cookie: string) => {
    const match = cookie.match(/(?:^|;\s*)user=([^;]+)/);
    return match?.[1] ?? "u-test";
  };
  const saveInterview = async () => ({ ok: true as const });
  const proposeKarteset = async () => [];

  return { nextQuestion, writeArticle, proposeKarteset, getUserId, saveInterview, turnsSeen };
}

describe("http session", () => {
  beforeEach(() => clearSession());

  it("honors X-Request-Id on /health", async () => {
    const app = createApp(fakeDeps());
    const res = await app.request("/health", {
      headers: { "X-Request-Id": "test-req-1" },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(res.headers.get("X-Request-Id"), "test-req-1");
  });

  it("create returns empty messages", async () => {
    const app = createApp(fakeDeps());
    const res = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    assert.equal(res.status, 200);
    const session = await res.json();
    assert.equal(session.messages.length, 0);
    assert.equal(session.reporterTyping, false);
    assert.equal(session.draft.status, "empty");
    assert.equal(session.exhausted, false);
    assert.equal(session.type, null);
    assert.equal(session.tone, null);
    assert.equal(session.testMode, false);
    assert.deepEqual(session.facts, FACTS.map((f) => ({ id: f.id, category: f.category, text: f.text })));
    assert.deepEqual(session.proposedFacts, []);
    assert.deepEqual(session.openers, [
      "משהו קרה בעבודה",
      "משהו קרה למישהו קרוב",
      "רגע קטן מהיום — מבזק",
    ]);
  });

  it("first postMessage is reader then reporter", async () => {
    const app = createApp(fakeDeps());
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    const res = await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "היה לי יום קשה" }),
    });
    assert.equal(res.status, 200);
    const session = sseSession(await res.text());
    assert.equal(session.messages.length, 2);
    assert.equal(session.messages[0].role, "reader");
    assert.equal(session.messages[1].role, "reporter");
    assert.equal(session.messages[1].text, "מה אמרת במשוב?");
  });

  it("second message does not re-open", async () => {
    const deps = fakeDeps();
    const app = createApp(deps);
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "פתיחה" }),
    });

    await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "תשובה" }),
    });

    assert.equal(deps.turnsSeen.length, 2);
    assert.equal(deps.turnsSeen[1][0].question, "");
    assert.equal(deps.turnsSeen[1][1].question, "מה אמרת במשוב?");
  });

  it("rejects empty text", async () => {
    const app = createApp(fakeDeps());
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    const res = await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   " }),
    });
    assert.equal(res.status, ERROR_STATUS.emptyMessage);
    const body = await res.json();
    assert.equal(body.message, ERROR_EMPTY_MESSAGE);
  });

  it("409 when no open interview", async () => {
    const app = createApp(fakeDeps());
    const res = await app.request("/interviews/nope/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "שלום" }),
    });
    assert.equal(res.status, ERROR_STATUS.noOpenInterview);
    const body = await res.json();
    assert.equal(body.message, ERROR_NO_OPEN_INTERVIEW);
  });

  it("404 for wrong interview id", async () => {
    const app = createApp(fakeDeps());
    await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });

    const res = await app.request("/interviews/wrong-id/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "שלום" }),
    });
    assert.equal(res.status, ERROR_STATUS.interviewNotFound);
    const body = await res.json();
    assert.equal(body.message, ERROR_INTERVIEW_NOT_FOUND);
  });

  it("rejects empty-chat draft", async () => {
    const app = createApp(fakeDeps());
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    const res = await app.request(`/interviews/${id}/draft`, { method: "POST" });
    assert.equal(res.status, ERROR_STATUS.noTranscript);
    const body = await res.json();
    assert.equal(body.message, ERROR_NO_TRANSCRIPT);
  });

  it("requestDraft maps headline", async () => {
    const app = createApp(fakeDeps());
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "פתיחה" }),
    });

    const res = await app.request(`/interviews/${id}/draft`, { method: "POST" });
    assert.equal(res.status, 200);
    const session = sseSession(await res.text());
    assert.equal(session.draft.status, "ready");
    assert.equal(session.draft.headline, "כותרת בדיקה");
    assert.equal(session.draft.pendingParagraph, null);
    assert.equal(session.exhausted, true);
  });

  it("fourth message stops the interview and writes a draft", async () => {
    const nextQuestion = async (): Promise<NextQuestion> => ({
      question: "עוד פרט?",
      done: false,
    });
    const writeArticle = async (): Promise<Article> => ({
      angle: "זווית",
      headline: "כותרת בדיקה",
      standfirst: "כותרת משנה",
      paragraphs: ["פסקה"],
      tone: "intimate",
      type: "feature",
    });
    const app = createApp({ ...fakeDeps(), nextQuestion, writeArticle });
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    let session!: InterviewSession;
    for (let i = 1; i <= 4; i++) {
      const res = await app.request(`/interviews/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `תשובה ${i}` }),
      });
      assert.equal(res.status, 200);
      session = sseSession(await res.text());
    }

    const readers = session.messages.filter((m) => m.role === "reader");
    const last = session.messages[session.messages.length - 1];
    assert.equal(readers.length, 4);
    assert.equal(last.role, "reader");
    assert.equal(session.exhausted, true);
    assert.equal(session.draft.status, "ready");
    assert.equal(session.draft.headline, "כותרת בדיקה");

    const extra = await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "עוד אחת" }),
    });
    assert.equal(extra.status, ERROR_STATUS.interviewClosed);
    const body = await extra.json();
    assert.equal(body.message, ERROR_INTERVIEW_CLOSED);
  });

  it("passes brief.subject.name through to writeArticle", async () => {
    let seenName: string | undefined;
    const nextQuestion = async (): Promise<NextQuestion> => ({
      question: "",
      done: true,
    });
    const writeArticle = async (input: {
      brief?: { subject?: { name?: string } };
    }): Promise<Article> => {
      seenName = input.brief?.subject?.name;
      return {
        angle: "זווית",
        headline: "כותרת בדיקה",
        standfirst: "כותרת משנה",
        paragraphs: ["פסקה"],
        tone: "intimate",
        type: "feature",
      };
    };
    const app = createApp({ ...fakeDeps(), nextQuestion, writeArticle });
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS, subjectName: "עומר" }),
    });
    const { id, subjectName } = await createRes.json();
    assert.equal(subjectName, undefined);

    await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "פתיחה" }),
    });
    await app.request(`/interviews/${id}/draft`, { method: "POST" });
    assert.equal(seenName, "עומר");
  });

  it("draft path attaches proposedFacts", async () => {
    const proposeKarteset = async () => [
      { text: "גר בחיפה", category: "personal" },
    ];
    const app = createApp({ ...fakeDeps(), proposeKarteset });
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();
    await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "פתיחה" }),
    });
    const res = await app.request(`/interviews/${id}/draft`, { method: "POST" });
    const session = sseSession(await res.text());
    assert.deepEqual(session.proposedFacts, [{ text: "גר בחיפה", category: "personal" }]);
  });

  it("PATCH form stores type and tone", async () => {
    const app = createApp(fakeDeps());
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    const res = await app.request(`/interviews/${id}/form`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "news", tone: "factual" }),
    });
    assert.equal(res.status, 200);
    const session = await res.json();
    assert.equal(session.type, "news");
    assert.equal(session.tone, "factual");
  });

  it("PATCH form null resets to auto", async () => {
    const app = createApp(fakeDeps());
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    await app.request(`/interviews/${id}/form`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "column" }),
    });
    const res = await app.request(`/interviews/${id}/form`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: null }),
    });
    assert.equal(res.status, 200);
    const session = await res.json();
    assert.equal(session.type, null);
  });

  it("passes stored form into writeArticle and stamps resolved ids", async () => {
    let seen: { type?: string; tone?: string } = {};
    const writeArticle = async (input: {
      type?: string;
      tone?: string;
    }): Promise<Article> => {
      seen = input;
      return {
        angle: "זווית",
        headline: "כותרת בדיקה",
        standfirst: "כותרת משנה",
        paragraphs: ["פסקה"],
        tone: "witty",
        type: "news",
      };
    };
    const app = createApp({
      ...fakeDeps(),
      nextQuestion: async () => ({ question: "מה קרה?", done: false }),
      writeArticle,
    });
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    await app.request(`/interviews/${id}/form`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "news" }),
    });
    await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "פתיחה" }),
    });

    const res = await app.request(`/interviews/${id}/draft`, { method: "POST" });
    const session = sseSession(await res.text());
    assert.equal(seen.type, "news");
    assert.equal(seen.tone, undefined);
    assert.equal(session.type, "news");
    assert.equal(session.tone, "witty");
  });

  it("PATCH form after exhaust is 409", async () => {
    const app = createApp(fakeDeps());
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();
    await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "פתיחה" }),
    });
    await app.request(`/interviews/${id}/draft`, { method: "POST" });

    const res = await app.request(`/interviews/${id}/form`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "news" }),
    });
    assert.equal(res.status, ERROR_STATUS.interviewClosed);
    const body = await res.json();
    assert.equal(body.message, ERROR_INTERVIEW_CLOSED);
  });

  it("PATCH form rejects unknown ids", async () => {
    const app = createApp(fakeDeps());
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();

    const res = await app.request(`/interviews/${id}/form`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "essay" }),
    });
    assert.equal(res.status, ERROR_STATUS.invalidForm);
    const body = await res.json();
    assert.equal(body.message, ERROR_INVALID_FORM);
  });

  it("429 from saveInterview does not call the LLM", async () => {
    let llm = 0;
    const saveInterview = async () => ({
      ok: false as const,
      status: 429,
      message: "הגעתם לשתי ידיעות להיום. מחר הכתב מחכה שוב.",
    });
    const nextQuestion = async (): Promise<NextQuestion> => {
      llm += 1;
      return { question: "?", done: false };
    };
    const writeArticle = async (): Promise<Article> => {
      llm += 1;
      return {
        angle: "זווית",
        headline: "כותרת",
        standfirst: "משנה",
        paragraphs: ["פסקה"],
        tone: "intimate",
        type: "feature",
      };
    };
    const app = createApp({ ...fakeDeps(), saveInterview, nextQuestion, writeArticle });
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();
    const res = await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "שלום" }),
    });
    assert.equal(res.status, 429);
    assert.equal(llm, 0);
  });

  it("two users do not share a session", async () => {
    const app = createApp(fakeDeps());
    const a = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "user=a" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const b = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "user=b" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const sa = (await a.json()) as { id: string };
    const sb = (await b.json()) as { id: string };
    assert.notEqual(sa.id, sb.id);

    const getA = await app.request("/interviews", { headers: { Cookie: "user=a" } });
    const getB = await app.request("/interviews", { headers: { Cookie: "user=b" } });
    assert.equal(((await getA.json()) as { id: string }).id, sa.id);
    assert.equal(((await getB.json()) as { id: string }).id, sb.id);
  });

  it("LLM throw becomes an SSE error payload", async () => {
    const writeArticle = async (): Promise<Article> => {
      throw new Error("boom");
    };
    const app = createApp({
      ...fakeDeps(),
      writeArticle,
      nextQuestion: async () => ({ question: "מה קרה?", done: false }),
    });
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS }),
    });
    const { id } = await createRes.json();
    await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "פתיחה" }),
    });
    const res = await app.request(`/interviews/${id}/draft`, { method: "POST" });
    assert.equal(res.status, 200);
    const payload = parseSseJson(await res.text()) as { message?: string; id?: string };
    assert.equal(payload.message, ERROR_LLM);
    assert.equal(payload.id, undefined);
  });

  it("testMode skips injected llm and returns placeholders", async () => {
    const { PLACEHOLDER_ARTICLE, PLACEHOLDER_QUESTIONS } = await import("./placeholders.js");
    let llm = 0;
    const nextQuestion = async (): Promise<NextQuestion> => {
      llm += 1;
      return { question: "real", done: false };
    };
    const writeArticle = async (): Promise<Article> => {
      llm += 1;
      throw new Error("real write");
    };
    const app = createApp({ ...fakeDeps(), nextQuestion, writeArticle });
    const createRes = await app.request("/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts: FACTS, testMode: true }),
    });
    const created = await createRes.json();
    assert.equal(created.testMode, true);
    const { id } = created;

    const asked = await app.request(`/interviews/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "פתיחה" }),
    });
    assert.equal(asked.status, 200);
    const afterAsk = parseSseJson(await asked.text()) as {
      messages: { role: string; text: string }[];
      testMode: boolean;
    };
    assert.equal(afterAsk.testMode, true);
    assert.equal(afterAsk.messages[1]?.text, PLACEHOLDER_QUESTIONS[0]);

    const drafted = await app.request(`/interviews/${id}/draft`, { method: "POST" });
    assert.equal(drafted.status, 200);
    const afterDraft = parseSseJson(await drafted.text()) as {
      draft: { headline: string };
      exhausted: boolean;
    };
    assert.equal(afterDraft.draft.headline, PLACEHOLDER_ARTICLE.headline);
    assert.equal(afterDraft.exhausted, true);
    assert.deepEqual(
      (afterDraft as { proposedFacts?: { text: string }[] }).proposedFacts,
      [{ text: "עובד בחברת בדיקה", category: "work" }],
    );
    assert.equal(llm, 0);
  });

  it("ignores testMode when NODE_ENV is production", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const app = createApp(fakeDeps());
      const createRes = await app.request("/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts: FACTS, testMode: true }),
      });
      const created = await createRes.json();
      assert.equal(created.testMode, false);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
