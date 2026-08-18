import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it, beforeEach } from "node:test";
import type { Article, NextQuestion, Turn } from "../types.js";

register("./hook.mjs", import.meta.url);

const {
  ERROR_EMPTY_MESSAGE,
  ERROR_INTERVIEW_NOT_FOUND,
  ERROR_NO_OPEN_INTERVIEW,
  ERROR_STATUS,
} = await import("../contract.js");
const { createApp } = await import("./app.js");
const { clearSession } = await import("./session.js");

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

  return { nextQuestion, writeArticle, turnsSeen };
}

describe("http session", () => {
  beforeEach(() => clearSession());

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
    const session = await res.json();
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
    const session = await res.json();
    assert.equal(session.draft.status, "ready");
    assert.equal(session.draft.headline, "כותרת בדיקה");
    assert.equal(session.draft.pendingParagraph, null);
  });
});
