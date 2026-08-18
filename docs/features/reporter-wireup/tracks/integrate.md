# Track — Wire user-first e2e + proxy

- id: `integrate`
- wave: `Wint`
- isolation: `sequential`
- owner_agents: reporter-engineer
- branch: `main`

## owns

- `ai-reporter/src/run.ts`
- `ai-reporter/src/run.test.ts`
- `ai-reporter/package.json`
- `frontend/vite.config.ts`

## reads

- `docs/features/reporter-wireup/PLAN.md`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/interviewer/`
- `ai-reporter/src/writer/`
- `ai-reporter/src/http/`
- `ai-reporter/src/contract.ts`
- `ai-reporter/src/fixtures/`
- `frontend/src/api/reporter/interview.ts`

## must_not

- `ai-reporter/src/interviewer/`
- `ai-reporter/src/writer/`
- `ai-reporter/src/http/`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/`
- `ai-reporter/src/contract.ts`
- `ai-reporter/package-lock.json`
- `frontend/src/api/reporter/`
- `frontend/src/api/types.ts`
- `frontend/src/routes/`
- `api/`

## Purpose

Make `runReporter` consume `answers[0]` as the user's opening, keep `npm test` as that live e2e, and proxy `/interviews` so an empty `VITE_REPORTER_URL` works. Shared freeze only.

## Implementation notes

- `runReporter`: seed `turns = [{ question: "", answer: answers[0] }]`, then loop `nextQuestion` using `answers.slice(1)` as replies. Opening is not an LLM call. Still cap with `MAX_QUESTIONS` / `askedCount`. Then `writeArticle`. Typical budget 5 (≤4 follow-ups + 1 article).
- `run.test.ts`: assert questions are follow-ups (grounded on persona **or** `weekAnswers[0]` before Q1). Do not treat `weekAnswers[0]` as the answer to Q1. Still 1–4 questions, no banned needles, intimate feature, 350–700 words, ≤5 calls, `[llm] call` in stdout.
- `package.json`: keep `test` as `src/run.test.ts` only (do not add interviewer/http live files). May add `dev`/`start` that run `src/http/listen.ts` — agents still must not execute them.
- `frontend/vite.config.ts`: proxy `/interviews` (and `/health` is already core — do not steal it) to `http://localhost:8788`. Leave core routes on 8787.
- Do not start vite or listen. Do not bump lockfile unless W0 missed a dep (then stop / `blocked_decision`).
- If desk-client fetch paths and HTTP routes disagree, fix only files in `owns` (proxy + run). Route bugs belong to a resume of `http-session` / `desk-client`, not a rewrite here.

## Goal test

Yes/no: `cd ai-reporter && npm test` exits 0, ≤5 LLM calls, user-first as in PLAN feature goal test items 2–4. `rg "/interviews" frontend/vite.config.ts` matches. `cd frontend && npm run lint` exits 0. `rg "mocks/db" frontend/src/api/reporter` is empty.

## Close notes

Done on `main` (`4ab9713`). User-first `runReporter` seeds `{ question: "", answer: answers[0] }`; live e2e 4 follow-ups, 5 LLM calls, intimate/feature 425 words, headline הריצה שאחרי שיחת המשוב. Vite `/interviews` → `:8788`. Goal test exit 0. Leftover: model variance; proxy is Vite-dev only.
