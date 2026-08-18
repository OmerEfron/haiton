# Track — Reporter HTTP session

- id: `http-session`
- wave: `W1`
- isolation: `worktree`
- owner_agents: reporter-engineer
- branch: `agent/feature/reporter-wireup/http-session`

## owns

- `ai-reporter/src/http/`

## reads

- `docs/features/reporter-wireup/PLAN.md`
- `ai-reporter/src/contract.ts`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/interviewer/interviewer.ts`
- `ai-reporter/src/writer/writer.ts`
- `frontend/src/api/types.ts`

## must_not

- `ai-reporter/src/contract.ts`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/interviewer/`
- `ai-reporter/src/writer/`
- `ai-reporter/src/run.ts`
- `ai-reporter/src/fixtures/`
- `ai-reporter/package.json`
- `ai-reporter/package-lock.json`
- `frontend/`
- `api/`

## Purpose

Serve the frozen desk JSON over Hono. Create is an empty thread. First message is the reader. Then call `nextQuestion` with an opening turn. Zero live LLM in this track.

## Implementation notes

- Context7 `/honojs/hono` before writing the app. Same shape as `api/src/app.ts`: `createApp()`, CORS from `FRONTEND_ORIGIN`, `GET /health`.
- Inject `{ nextQuestion, writeArticle }` into `createApp` so tests pass fakes. Default to the real modules for listen.
- In-memory singleton (one current session). `POST /interviews` replaces it. Body `{ facts }`. Response: `messages: []`, `reporterTyping: false`, `draft.status: "empty"`, `openers` from `SESSION_OPENERS`, `exhausted: false`.
- `postMessage`: reject empty text / missing session with PLAN Hebrew strings. Append reader message **first**. Build turns: opening = first reader text with `question: ""`; later pairs are last reporter question + that answer. Never call `nextQuestion` with `[]`. Append the returned question as a reporter message. If `done && !question`, set `exhausted` and call `writeArticle` once (fake in tests) to fill `draft`. Map `Article` → `Draft` (`status: "ready"`, `pendingParagraph: null`, `angle/headline/standfirst/paragraphs`).
- `requestDraft`: `writeArticle` with current turns + `DEFAULT_TONE` / `DEFAULT_TYPE`.
- `GET /interviews` 204 when none. Errors `{ message }`.
- `http.test.ts`: **fakes only**, 0 live calls. Cases: create has zero messages; first postMessage first role is `reader` then `reporter`; second message does not re-open; 400 empty text; 409/404 Hebrew; draft maps headline. Use `app.request`. Do not call `serve()`.
- `listen.ts` may exist for humans; agents must not run it.
- Do not edit `package.json` (no `dev` script this wave — Wint).

## Goal test

Yes/no: `cd ai-reporter && node --experimental-strip-types --test src/http/http.test.ts` exits 0. `rg "responses.create" ai-reporter/src/http` is empty. A test asserts create `messages.length === 0` and after first message `messages[0].role === "reader"`. No listen / `serve(` in the test file.

## Close notes

_Not started._
