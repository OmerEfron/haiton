# Track — Integration

- id: `integrate`
- wave: `Wint`
- isolation: `sequential`
- owner_agents: backend-engineer
- branch: `main` (current checkout after W1 merges)

## owns

- `api/src/app.ts`
- `api/src/index.ts`
- `api/src/seed.ts`
- `frontend/vite.config.ts`

## reads

- `api/src/auth/`
- `api/src/stories/`
- `api/src/karteset/`
- `api/src/circle/`
- `api/src/profile/`
- `api/src/contract.ts`
- `api/src/db.ts`
- `frontend/src/mocks/fixtures/`
- `frontend/src/api/core/`

## must_not

- `frontend/src/api/types.ts`
- `frontend/src/api/reporter/`
- `frontend/src/components/`
- `frontend/src/routes/`
- `frontend/src/mocks/db.ts`
- `reporter/`
- `api/src/auth/`
- `api/src/stories/`
- `api/src/karteset/`
- `api/src/circle/`
- `api/src/profile/`

## Purpose

Wire the five W1 routers into one Hono app, CORS + credentials for the Vite origin, seed core tables from existing fixtures (not interview), optional Vite proxy so `VITE_API_URL` can be empty in dev.

## Implementation notes

- `createApp()` used by tests via `app.request`. `index.ts` is the only listen — **do not run it** in this track; writing it is enough.
- Seed: profile/user, stories, flashes, facts, connections, invitations, reader directory. Skip `interview-script.ts`.
- CORS: frontend origin, `credentials: true`.
- Vite proxy `/auth`, `/editions`, `/stories`, `/flashes`, `/profile`, `/karteset`, `/connections`, `/invitations`, `/readers`, `/health` → `http://localhost:8787` **or** document `VITE_API_URL` only. Prefer proxy so the cookie is same-origin. Confirm Vite `server.proxy` with Context7 `/vitejs/vite` before editing.
- One `api/src/app.test.ts` (this track owns `api/src/app.ts` so the test file sits beside it): `/health` plus one GET per module. Still no listen.
- If a W1 export name is wrong, fix **only** `app.ts` imports; do not rewrite routers.

## Goal test

Yes/no: `cd api && npm test` includes the app-level smoke. `cd frontend && npm run build` exits 0. `rg "from \"../../mocks" frontend/src/api/core` is empty. `frontend/src/api/reporter/interview.ts` still imports the mock db.

## Close notes

Mounted W1 routers in `createApp()` with CORS + credentials, fixture seed (no interview), Vite proxy, and in-process `/health` + one GET per module. `listSuggestedConnections` got an explicit `Promise<ReaderSearchResult[]>` so `npm run build` passes; CirclePage untouched. Wrev not started.
