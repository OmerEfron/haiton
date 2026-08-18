# Track — HTTP contract and user-first rules

- id: `contracts`
- wave: `W0`
- isolation: `sequential`
- owner_agents: reporter-engineer
- branch: `main`

## owns

- `ai-reporter/src/contract.ts`
- `ai-reporter/src/contract.test.ts`
- `ai-reporter/src/types.ts`
- `ai-reporter/package.json`
- `ai-reporter/package-lock.json`
- `ai-reporter/.env.example`
- `frontend/.env.example`

## reads

- `docs/features/reporter-wireup/PLAN.md`
- `frontend/src/api/types.ts`
- `frontend/src/mocks/fixtures/interview-script.ts`
- `api/src/app.ts`

## must_not

- `ai-reporter/src/interviewer/`
- `ai-reporter/src/writer/`
- `ai-reporter/src/http/`
- `ai-reporter/src/run.ts`
- `ai-reporter/src/run.test.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/`
- `frontend/src/api/`
- `frontend/src/routes/`
- `frontend/package.json`
- `api/`

## Purpose

Freeze the reporter HTTP table, desk JSON keys, opening-turn rule, default tone/type, and env names. Add Hono deps. Zero live OpenAI. Zero listen.

## Implementation notes

- Context7 `/honojs/hono` **before** adding `hono` and `@hono/node-server` to `package.json`. Match `api/` versions if practical. Do not create `src/http/` yet.
- `contract.ts`: route table from PLAN.md (method, path, handler name). Export `SESSION_OPENERS` (the three chips). Export Hebrew error strings. Export JSON key lists for `InterviewSession` / `InterviewMessage` / `Draft` matching `frontend/src/api/types.ts` — copy names, do not import frontend.
- `types.ts` (additive only): `askedCount(turns)` = turns whose `question` is non-empty; `DEFAULT_TONE = "intimate"`; `DEFAULT_TYPE = "feature"`. Do not change `Turn`, `MAX_QUESTIONS`, needles, or labels.
- `.env.example` (ai-reporter): keep existing keys; add `PORT=8788` and `FRONTEND_ORIGIN=http://localhost:5173`.
- `frontend/.env.example`: keep `VITE_API_URL=`; add `VITE_REPORTER_URL=` with a comment that empty uses the Vite proxy.
- `contract.test.ts`: every PLAN route is in the table; `askedCount([{ question: "", answer: "x" }]) === 0`; `askedCount` of one real Q is 1; defaults are intimate/feature; openers length 3. No `complete()` / `responses.create`.
- Keep the existing `package.json` `test` script pointing at `run.test.ts` (do not replace it). Do not add a `dev` listen script this wave.
- Do not start a server. Do not edit interviewer/writer/run.

## Goal test

Yes/no: `cd ai-reporter && node --experimental-strip-types --test src/contract.test.ts` exits 0. `rg "hono" ai-reporter/package-lock.json` matches. `rg "askedCount|DEFAULT_TONE|DEFAULT_TYPE" ai-reporter/src/types.ts` matches. `rg "VITE_REPORTER_URL" frontend/.env.example` matches. `rg "PORT=8788" ai-reporter/.env.example` matches. `python3 scripts/check_feature_tracks.py docs/features/reporter-wireup/status.json` exits 0.

## Close notes

Done. Frozen 8 PLAN.md routes in `ai-reporter/src/contract.ts`; `askedCount` ignores empty opening questions; defaults `intimate`/`feature`; Hono deps in lockfile; env names set. Contract tests pass (5). Zero live OpenAI. No listen. Commit `6d53fff`.
