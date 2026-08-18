# Map — reporter-wireup

Readonly inventory for this feature. Not a product dump.

## What ships today (touching this feature)

Haiton is a Hebrew RTL personal newspaper. Core persistence is live in `api/` (Hono + SQLite). The desk UI (`/interview`) still talks to a **scripted mock** in `frontend/src/api/reporter/interview.ts` → `mocks/db.ts` + `interview-script.ts`. `startSession()` seeds a **reporter** opener before the reader speaks. Copy already describes the opposite (`desk.emptyFirstBody`, composer label `"מה קרה?"`).

`ai-reporter/` is the real brain: `nextQuestion(facts, turns)` and `writeArticle(...)`, orchestrated by `runReporter({ facts, answers, tone, type })`. It has **no HTTP**. `nextQuestion` with empty turns asks the first question (reporter-first). `core-api` and `desk-truth` are complete. Feature `ai-reporter` built the agents and left this wire-up out of scope.

## Stack

- Frontend: React 19, Vite 8, TypeScript ~6. `frontend/package-lock.json`. Lint: oxlint. No frontend test script. HTTP helper: `frontend/src/api/client.ts` `request()` (`VITE_API_URL`, `{ message }` → `ApiError`). Reporter client does **not** use it yet.
- API: Hono + `node:sqlite` on **8787**. Out of scope for this feature.
- ai-reporter: Node 24, `type: module`, official `openai` SDK, Responses API, model `gpt-5.5`. Context7 `/websites/developers_openai_api` for LLM. Context7 `/honojs/hono` + `@hono/node-server` before adding the reporter HTTP app. Context7 `/websites/cursor` before launching waves.
- Overlap: `python3 scripts/check_feature_tracks.py docs/features/reporter-wireup/status.json`

## Modules this feature may extend

- `ai-reporter/src/types.ts` — W0 only: opening-turn rule + default tone/type. `Turn` shape stays.
- `ai-reporter/src/contract.ts` — new. Frozen route table + JSON keys matching `frontend/src/api/types.ts` reporter block.
- `ai-reporter/src/interviewer/` — user-first follow-ups (opening `Turn.question === ""`).
- `ai-reporter/src/http/` — new Hono app. In-memory session. `app.request` tests. No listen in tests.
- `ai-reporter/src/run.ts` + `run.test.ts` — Wint: first canned answer is the user's opening report.
- `ai-reporter/package.json` + lockfile + `.env.example` — W0 adds Hono; Wint adds `dev`/`start` scripts.
- `frontend/src/api/reporter/` — swap mock bodies to HTTP. Signatures stay.
- `frontend/src/routes/InterviewRoom.tsx` — only if empty-thread UX needs a one-line fix after `startSession` returns `messages: []`.
- `frontend/src/copy/desk.ts` — only reporter-first leftover lines (e.g. subtitle).
- `frontend/.env.example` — `VITE_REPORTER_URL=`
- `frontend/vite.config.ts` — Wint: proxy `/interviews` → `:8788`

## Do not touch

- `api/` — no reporter routes in the core service. `backend-engineer` stays out.
- `frontend/src/api/types.ts` / `api/src/types.ts` — wire shapes stay. HTTP JSON **is** `InterviewSession`.
- `frontend/src/api/core/` — karteset/stories/auth stay. Desk still `listFacts()` then publishes via `publishStory`.
- `frontend/src/mocks/db.ts`, `frontend/src/mocks/fixtures/` — mock store stays for anything still mocked; reporter client must stop importing it.
- `frontend/src/router.tsx` — `/interview` already exists.
- `frontend/src/components/` — ChatBubble / DraftPanel already render empty threads and typing.
- `ai-reporter/src/writer/` — writer already takes `Turn[]`; opening answer is just another answer.
- `ai-reporter/src/llm.ts` — wrapper stays.
- `ai-reporter/src/fixtures/` — persona + week answers stay; meaning of `weekAnswers[0]` becomes "user opening".
- Tone/type picker UI, streaming/SSE, karteset writes, a second Cursor OS, CSS redesign.

## Existing checks (do not start the app)

- overlap: `python3 scripts/check_feature_tracks.py docs/features/reporter-wireup/status.json`
- frontend lint: `cd frontend && npm run lint`
- frontend build: `cd frontend && npm run build` (Wint/Wrev)
- ai-reporter contract: `cd ai-reporter && node --experimental-strip-types --test src/contract.test.ts`
- ai-reporter http: `cd ai-reporter && node --experimental-strip-types --test src/http/http.test.ts` (zero live LLM)
- ai-reporter interviewer live: `cd ai-reporter && node --env-file=../.env --env-file=.env --experimental-strip-types --test src/interviewer/interviewer.test.ts` (W1 only; honor budget)
- ai-reporter e2e: `cd ai-reporter && npm test` (Wint/Wrev; `OPENAI_API_KEY`; honor PLAN caps)
- api test: `cd api && npm test` (do not regress; this feature does not edit `api/`)
- Do **not** start vite, `api` listen, or `ai-reporter` listen

## Cursor OS already present

- none (no `docs/work-status.json`, no `docs/work-plan-status.json`)
- agents reused: `tech-lead` (grok-4.6), `reporter-engineer` (composer-2.5[]), `frontend-engineer` (composer-2.5[]), `qa-reviewer` (grok-4.5, readonly)
- do **not** add agents. `backend-engineer` is not on this feature.
- skills/commands already installed: `/execute-feature-wave`, `/close-feature`
- worktrees: `.cursor/worktrees.json` already has frontend + api + ai-reporter `npm ci`
- sibling feature `ai-reporter` is still `in_progress` with all waves complete — `/execute-feature-wave` must be given id `reporter-wireup`. Human may `/close-feature ai-reporter` separately.
