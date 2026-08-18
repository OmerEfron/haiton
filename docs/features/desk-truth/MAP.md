# Map — desk-truth

Readonly inventory for this feature. Not a product dump.

## What ships today (touching this feature)

Haiton core API (`api/`, Hono + SQLite) is live. `frontend/src/api/core/` calls it. Interviewing is still the in-memory reporter mock (`frontend/src/api/reporter/interview.ts` → `frontend/src/mocks/db.ts`). After `core-api` closed, the newspaper still lies in a few places: seed stats do not match seeded rows, the front-page draft teaser is frozen copy, invitations drop the dialog payload, and a handful of UI handlers are wrong or missing. This feature closes that split and those bugs. It does not build the reporter service.

## Stack

- Frontend: React 19, Vite 8, TypeScript ~6, TanStack Query 5, React Router 8. `frontend/package-lock.json`. Node `>=20.19` (`.nvmrc` 24).
- API: Hono + `@hono/node-server`, `node:sqlite`. `api/package-lock.json`.
- Lint: `cd frontend && npm run lint` (oxlint). Build: `cd frontend && npm run build`.
- API tests: `cd api && npm test` currently runs only `contract.test.ts`, `app.test.ts`, `app.integration.test.ts`. Domain files `auth.test.ts`, `stories.test.ts`, `circle.test.ts`, `karteset.test.ts`, `profile.test.ts` exist but are not in that script.
- Overlap: `python3 scripts/check_feature_tracks.py docs/features/desk-truth/status.json`
- Context7: `/honojs/hono` before new Hono APIs; `/websites/cursor` for agent/worktree launch. No new dependencies.

## Modules this feature may extend

- `api/src/schema.sql` — W0 only. New `invitation_meta` table (existing DBs get it via `CREATE TABLE IF NOT EXISTS`).
- `api/src/auth/` — duplicate-email sign-up error.
- `api/src/circle/` — persist invitation relation/section/note/settings; compute suggested + `updatedThisWeek`.
- `api/src/stories/` — stop `FROZEN_OPEN_DRAFT`; recompute digests + section counts on publish.
- `api/src/seed.ts` — Wint. Align `profile_stats` with seeded row counts; `drafts_in_progress = 0`.
- `frontend/src/mocks/fixtures/profile.ts` — Wint. Same stats as seed (fixture is the seed source).
- `frontend/src/api/reporter/interview.ts` — cold opener via `listFacts()`; save vs discard; discard after publish.
- `frontend/src/routes/InterviewRoom.tsx`, `FrontPage.tsx`, `ProfilePage.tsx` — draft overlay from reporter session; publish clears session.
- `frontend/src/components/interview/DraftPanel.tsx` — save-as-draft must not discard.
- `frontend/src/components/layout/BottomNav.tsx` + `frontend/src/lib/queryKeys.ts` — one interview query key.
- `frontend/src/routes/CirclePage.tsx` + new `frontend/src/components/circle/EditConnectionDialog.tsx` — wire `updateConnection`.

## Do not touch

- `frontend/src/api/types.ts` / `api/src/types.ts` — wire shapes stay.
- `frontend/src/api/client.ts` — `request` already exists.
- `api/src/contract.ts` — no new HTTP routes. Invitation extra fields are server-side only (used on accept).
- `api/src/db.ts`, `api/src/app.ts` — no new routers to mount.
- `frontend/src/router.tsx` — no new screens.
- `frontend/src/api/core/` — clients already send the payloads; do not change signatures.
- `reporter/` — still does not exist. Do not create it.
- `frontend/src/mocks/db.ts` and interview-script fixtures — reporter store stays; do not rip it out.
- Image uploads, notifications, email, SSO, copy redesign, CSS.

## Existing checks (do not start the app)

- overlap: `python3 scripts/check_feature_tracks.py docs/features/desk-truth/status.json`
- api test: `cd api && npm test` (Wint adds domain test files to this script)
- per-track api: `cd api && node --experimental-strip-types --test src/<module>/<module>.test.ts`
- frontend lint: `cd frontend && npm run lint`
- frontend build: `cd frontend && npm run build` (Wint / Wrev)
- frontend tests: none

## Cursor OS already present

- none (no `docs/work-status.json`, no `docs/work-plan-status.json`)
- agents reused: `tech-lead` (grok-4.6), `backend-engineer` (composer-2.5[]), `qa-reviewer` (grok-4.5, readonly)
- agent added for this feature: `frontend-engineer` (composer-2.5[]) — UI + reporter mock; core-api had no frontend owner
- models: Cursor pool only (Grok 4.6 / Grok 4.5 / Composer 2.5). No API models.
- skills/commands already installed: `/execute-feature-wave`, `/close-feature` (merged to take any `docs/features/<id>/`)
- worktrees: `.cursor/worktrees.json` already has frontend + api `npm ci`
