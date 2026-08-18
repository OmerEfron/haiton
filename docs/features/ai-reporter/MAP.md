# Map — ai-reporter

Readonly inventory for this feature. Not a product dump.

## What ships today (touching this feature)

Haiton is a Hebrew RTL personal newspaper. Core persistence (auth, stories, karteset, circle, profile) is live in `api/` (Hono + SQLite). The editorial desk UI (`/interview`) talks to a **scripted mock** in `frontend/src/api/reporter/interview.ts` → `frontend/src/mocks/db.ts` + `interview-script.ts`. Cold opener already reads live karteset via `listFacts()`. There is **no runtime LLM**. `core-api` and `desk-truth` are complete. This feature builds the first real reporter: two OpenAI agents (interviewer, writer) in `ai-reporter/`. It does not replace the desk mock or add HTTP routes.

## Stack

- Frontend: React 19, Vite 8, TypeScript ~6. `frontend/package-lock.json`. Node `>=20.19` (`.nvmrc` 24). Lint: oxlint. No frontend test script.
- API: Hono + `node:sqlite`. `api/package-lock.json`. Tests: `node --experimental-strip-types --test`.
- This feature: new npm package `ai-reporter/` (Node 24, `type: module`, `node --experimental-strip-types`). Official `openai` SDK. **Responses API** (`client.responses.create`, read `output_text`). Model id **`gpt-5.5`**. Key: `OPENAI_API_KEY` from `.env` (repo root and/or `ai-reporter/.env`). Context7 `/websites/developers_openai_api` before adding the SDK. Context7 `/websites/cursor` before launching waves.
- Overlap: `python3 scripts/check_feature_tracks.py docs/features/ai-reporter/status.json`

## Modules this feature may extend

- `ai-reporter/` — new service home (empty today). Package, types, LLM wrapper, interviewer, writer, orchestrator, live tests.
- `.cursor/worktrees.json` — W0 appends `npm ci --prefix ai-reporter` and a non-failing `.env` copy so W1 worktrees can call OpenAI.
- `frontend/src/mocks/fixtures/facts.ts` — **read only**. Persona seed for live tests (עומר עפרון / חיפה / אד־טק / מיכל / בת גלים). Copy into `ai-reporter/src/fixtures/`, do not import across packages.

## Do not touch

- `api/` — core contract is closed. No reporter routes in `api/src/contract.ts`.
- `frontend/src/api/types.ts` / `api/src/types.ts` — wire shapes stay. Reporter output lives in `ai-reporter/src/types.ts`.
- `frontend/src/api/reporter/` — mock signatures stay. Do not swap bodies to HTTP.
- `frontend/src/mocks/db.ts`, `frontend/src/mocks/fixtures/interview-script.ts` — mock store stays.
- `frontend/src/routes/`, `frontend/src/components/`, `frontend/src/router.tsx` — no tone/type UI this feature.
- `frontend/src/api/core/` — karteset/stories clients stay.
- `frontend/package.json`, `api/package.json` — freeze.
- Image uploads, notifications, email, SSO, streaming, mention extractor, publish-from-reporter.

## Existing checks (do not start the app)

- overlap: `python3 scripts/check_feature_tracks.py docs/features/ai-reporter/status.json`
- api test: `cd api && npm test` (do not regress; this feature does not edit `api/`)
- frontend lint: `cd frontend && npm run lint` (only if a track touches frontend — none should)
- ai-reporter live: `cd ai-reporter && npm test` (Wint / Wrev only; needs `OPENAI_API_KEY`; **one** e2e file)
- W1 module live: `cd ai-reporter && node --env-file=../.env --env-file=.env --experimental-strip-types --test src/<module>/<module>.test.ts`
- Do **not** start vite, `api` listen, or an `ai-reporter` HTTP server

## Cursor OS already present

- none (no `docs/work-status.json`, no `docs/work-plan-status.json`)
- agents reused: `tech-lead` (grok-4.6), `qa-reviewer` (grok-4.5, readonly)
- agent added for this feature: `reporter-engineer` (composer-2.5[]) — `ai-reporter/` only. `backend-engineer` stays out of reporter. `frontend-engineer` stays on UI/mock.
- models: Cursor pool only for agents (Grok 4.6 / Grok 4.5 / Composer 2.5). Product runtime is OpenAI `gpt-5.5`.
- skills/commands already installed: `/execute-feature-wave`, `/close-feature`
- worktrees: `.cursor/worktrees.json` has frontend + api `npm ci`; W0 adds ai-reporter
