# Track — Contracts and LLM wrapper

- id: `contracts`
- wave: `W0`
- isolation: `sequential`
- owner_agents: reporter-engineer
- branch: `main`

## owns

- `ai-reporter/package.json`
- `ai-reporter/package-lock.json`
- `ai-reporter/tsconfig.json`
- `ai-reporter/.env.example`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/persona.ts`
- `ai-reporter/src/fixtures/week-answers.ts`
- `.cursor/worktrees.json`

## reads

- `docs/features/ai-reporter/PLAN.md`
- `frontend/src/mocks/fixtures/facts.ts`

## must_not

- `ai-reporter/src/interviewer/`
- `ai-reporter/src/writer/`
- `frontend/`
- `api/`
- `frontend/src/api/types.ts`

## Purpose

Scaffold `ai-reporter/` and freeze the contract both W1 agents implement. Zero live OpenAI calls.

## Implementation notes

- Context7 `/websites/developers_openai_api` **before** adding `openai` to `package.json`. Node 24, `"type": "module"`, `engines.node >=20.19`. No Hono. No listen script.
- `types.ts`: `ToneId`, `ArticleTypeId`, labels from PLAN.md, `MAX_QUESTIONS = 4`, `GENERIC_QUESTION_NEEDLES`, `WORD_COUNT`, `FactInput`, `Turn`, `NextQuestion`, `Article`, `MODEL = "gpt-5.5"`.
- `llm.ts`: `complete({ instructions, input, budget })` — `new OpenAI()`, `responses.create`, return `output_text`, increment a module counter, print `[llm] call n/budget`, throw if `n > budget` or key missing. Also export `getCallCount()` and `resetCallCount()`. Do not call `complete` from W0.
- Fixtures: copy facts into `persona.ts`; put the four canned answers from PLAN.md into `week-answers.ts`.
- `.env.example`: `OPENAI_API_KEY=` and `OPENAI_MODEL=gpt-5.5`. Do not copy real secrets.
- `package.json` `test` script may be a placeholder that is **not** a live call (or omit test until Wint). Wint will set `test` to `src/run.test.ts` only.
- Append to `.cursor/worktrees.json` `setup-worktree` (keep existing frontend/api lines): `npm ci --prefix ai-reporter`, and a copy of root `.env` that does not fail if the file is missing.
- Do not start a server. Do not install extra deps besides `openai` + `@types/node` / `typescript` if needed (strip-types can skip tsc).

## Goal test

Yes/no: those owned files exist. `ai-reporter/package-lock.json` mentions `openai`. `rg "gpt-5.5" ai-reporter/src/types.ts ai-reporter/.env.example` matches. `rg "responses.create" ai-reporter/src` is only inside `llm.ts` (wrapper, not invoked). `python3 scripts/check_feature_tracks.py docs/features/ai-reporter/status.json` exits 0.

## Close notes

Done. Frozen types/labels/needles/word bands, Responses API wrapper (`complete` in `llm.ts`, not invoked), persona + week fixtures, `openai` in lockfile. Goal test passed. Commit `f0fd998`. Zero live calls.
