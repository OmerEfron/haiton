# Map — core-api

Readonly inventory for this feature. Not a product dump.

## What ships today (touching this feature)

Haiton (`העיתון`) is a Hebrew personal newspaper. The React+Vite frontend is shipped against an in-memory mock: every function under `frontend/src/api/core/` reads `frontend/src/mocks/db.ts` and returns the wire shapes in `frontend/src/api/types.ts`. There is no `fetch`, no `VITE_API_URL`, no OpenAPI. `api/` and `reporter/` exist as empty reserved folders. The real core service belongs in `api/`. Reporter interviewing stays on mocks.

## Stack

- Frontend: React 19, Vite 8, TypeScript ~6, TanStack Query 5, React Router 8. npm lockfile (`frontend/package-lock.json`). Node `>=20.19` (`.nvmrc` 24).
- Lint: `cd frontend && npm run lint` (oxlint). Build: `cd frontend && npm run build`. **No test script.**
- Planned core API (this feature): TypeScript + Hono on Node (`@hono/node-server`), `node:sqlite` for persistence, cookie session. Confirm Hono APIs with Context7 `/honojs/hono` in W0 before adding deps. Do not invent a second runtime.

## Modules this feature may extend

- `api/` — empty. New core service (auth, users, stories/editions, karteset, circle, profile).
- `frontend/src/api/types.ts` — frozen wire shapes. **Read only.** Real JSON must match.
- `frontend/src/api/client.ts` — planned HTTP client home (`ApiError`, `clone`, `delay` still used by reporter mocks).
- `frontend/src/api/core/auth.ts` — `getSession`, `signIn`, `signUp`, `signOut`. Comments: `GET /auth/session`, `POST /auth/sign-in|sign-up|sign-out`.
- `frontend/src/api/core/stories.ts` — `getFrontPage`, `getStory`, `listStories`, `listFlashes`, `publishStory`. Comments: `GET /editions/current`, `GET /stories/:id`, `POST /stories`.
- `frontend/src/api/core/karteset.ts` — fact CRUD. Comments: `GET/POST /karteset/facts`, `PATCH/DELETE /karteset/facts/:id`.
- `frontend/src/api/core/connections.ts` — circle graph. Comments: `GET /connections`, `GET /invitations`, `GET /readers?q=`, `POST /invitations`, `POST /invitations/:id/respond`, `PATCH/DELETE /connections/:id`.
- `frontend/src/api/core/profile.ts` — `getProfile`, `updateEditionSettings`. Comments: `GET /profile`, `PATCH /profile/edition-settings`.
- `frontend/src/lib/queryKeys.ts` — read only (keys already match the functions).
- `frontend/src/mocks/fixtures/{profile,stories,flashes,facts,connections}.ts` — seed source for the real DB. Do not delete; reporter still needs `db.ts`.

## Do not touch

- `frontend/src/components/` — README: UI does not change.
- `frontend/src/routes/` — same.
- `frontend/src/copy/` — Hebrew copy stays in the UI.
- `frontend/src/api/reporter/` — reporter API, out of scope.
- `frontend/src/mocks/fixtures/interview-script.ts` — reporter.
- `frontend/src/mocks/db.ts` — still the reporter mock store (`interview`, `interviewBeat`). Core files must stop importing it; do not rip it out.
- `reporter/` — reserved empty folder, out of scope.
- `frontend/package.json` / `frontend/package-lock.json` — native `fetch` is enough.

## Existing checks (do not start the app)

- lint: `cd frontend && npm run lint`
- build: `cd frontend && npm run build`
- test: none in frontend. After W0: `cd api && npm test`
- overlap: `python3 scripts/check_feature_tracks.py docs/features/core-api/status.json`

## Cursor OS already present

- none (no `.cursor/agents` before this pack, no `docs/work-status.json`, no `docs/work-plan-status.json`)
- agents added for this feature only: `tech-lead`, `backend-engineer`, `qa-reviewer`
- models: Cursor pool only (Grok 4.6 / Grok 4.5 / Composer 2.5). No API models.
