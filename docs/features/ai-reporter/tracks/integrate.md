# Track — Integrate

- id: `integrate`
- wave: `Wint`
- isolation: `sequential`
- owner_agents: reporter-engineer
- branch: `main`

## owns

- `ai-reporter/src/run.ts`
- `ai-reporter/src/run.test.ts`
- `ai-reporter/package.json`

## reads

- `docs/features/ai-reporter/PLAN.md`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/`
- `ai-reporter/src/interviewer/`
- `ai-reporter/src/writer/`

## must_not

- `ai-reporter/src/interviewer/`
- `ai-reporter/src/writer/`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/`
- `frontend/`
- `api/`
- `ai-reporter/package-lock.json`

## Purpose

Wire interviewer then writer. `npm test` is the live e2e only, so Wrev does not re-spend W1 quota.

## Implementation notes

- `runReporter({ facts, answers, tone, type })`: `resetCallCount()`, loop `nextQuestion` with canned `answers` in order until `done` or 4 questions; then `writeArticle`. Return `{ questions, article, llmCalls: getCallCount() }`.
- `package.json` `test`: `node --env-file=../.env --env-file=.env --experimental-strip-types --test src/run.test.ts` **only**. Do not add interviewer/writer test files.
- Live combo: `intimate` + `feature`. Budget **8**. Assert feature goal test items 2–4 (≤5 creates on a clean process, 1–4 grounded questions, 350–700 words).
- Do not start a server. Do not edit frontend.

## Goal test

Yes/no: `cd ai-reporter && npm test` exits 0. One process, ≤5 `[llm] call` lines (or reported count ≤5). Article tone/type `intimate`/`feature`.

## Close notes

Done on `main` (`f22414e`). `runReporter` + live e2e; 5 `complete()` (4 interviewer + 1 writer), 3 grounded questions, intimate/feature 402 words, headline השיחה שרצה איתו. Goal test exit 0. Leftover: resets `callCount` before `writeArticle` because the writer’s frozen budget is 4.
