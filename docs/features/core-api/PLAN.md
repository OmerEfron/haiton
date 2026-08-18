# Feature plan — Core API (un-mock the newspaper)

- id: `core-api`
- status: `complete`
- isolation_default: `worktree`
- base_branch: `main`

## Purpose

Replace the in-memory core mock with a real HTTP API in `api/` so the shipped frontend can call it. Function signatures under `frontend/src/api/core/` stay. Wire JSON stays `frontend/src/api/types.ts`. The UI (`components/`, `routes/`) does not change.

## Out of scope

- Reporter API (`frontend/src/api/reporter/`, `reporter/`, interview session, draft generation, streaming)
- UI redesign, copy, CSS, new screens
- `updateConnection` UI (function exists; no screen calls it — still implement the HTTP route)
- Auth providers, email, SSO
- Image uploads, search ranking, notifications
- Deploy / hosting
- A second Cursor OS or a product roadmap

## Goal test

Yes/no. All of these are true:

1. `python3 scripts/check_feature_tracks.py docs/features/core-api/status.json` exits 0
2. `cd api && npm test` exits 0 — every frozen route in `api/src/contract.ts` returns the matching `types.ts` shape (or the documented Hebrew `ApiError`)
3. `cd frontend && npm run lint` and `cd frontend && npm run build` exit 0
4. No file under `frontend/src/api/core/` imports `frontend/src/mocks/` (reporter may still)
5. `frontend/src/api/reporter/interview.ts` still uses the mock store

Do **not** start `vite` or the API listen loop to prove this. Handler tests and `tsc`/lint are enough.

## Commits

After **each track** goal test passes, commit (track branch, or `main` if sequential). After the wave collect, commit the `status.json` update. Required and allowed. Do not push unless asked. No secrets.

## Frozen contract (W0 writes this; later waves only consume it)

Missing comment-paths filled here so tracks do not invent URLs:

| Method | Path | Function |
|---|---|---|
| GET | `/health` | (api only) |
| GET | `/auth/session` | `getSession` |
| POST | `/auth/sign-in` | `signIn` `{ email, password }` |
| POST | `/auth/sign-up` | `signUp` `{ name, email, password }` |
| POST | `/auth/sign-out` | `signOut` |
| GET | `/editions/current` | `getFrontPage` |
| GET | `/stories/:id` | `getStory` |
| GET | `/stories` | `listStories` query `section?` |
| GET | `/flashes` | `listFlashes` → `{ flashes, dateShort }` |
| POST | `/stories` | `publishStory` body = `Draft` |
| GET | `/profile` | `getProfile` |
| PATCH | `/profile/edition-settings` | `updateEditionSettings` |
| GET | `/karteset/facts` | `listFacts` |
| POST | `/karteset/facts` | `addFact` |
| PATCH | `/karteset/facts/:id` | `updateFact` |
| DELETE | `/karteset/facts/:id` | `removeFact` |
| GET | `/connections` | `listConnections` |
| GET | `/connections/summary` | `getCircleSummary` |
| GET | `/connections/suggested` | `listSuggestedConnections` |
| GET | `/invitations` | `listInvitations` |
| POST | `/invitations` | `sendInvitation` |
| POST | `/invitations/:id/respond` | `respondToInvitation` `{ accept }` |
| DELETE | `/invitations/:id` | `cancelInvitation` |
| PATCH | `/connections/:id` | `updateConnection` |
| DELETE | `/connections/:id` | `removeConnection` |
| GET | `/readers` | `searchReaders` query `q` |

Errors: JSON `{ "message": "<hebrew>" }` + HTTP status; frontend `ApiError` reads `message`. Cookie session name `iton_session` (httpOnly). Env: `PORT` (default 8787), `DATABASE_PATH`, `SESSION_SECRET`, `VITE_API_URL`.

Auth is no longer auto-signed-in on load. Seed user `omer@example.com` (from `frontend/src/mocks/fixtures/profile.ts`) so Login still works. Password: any non-empty string matches the mock's lax check, **or** a documented seed password in `.env.example` — pick one in W0 and freeze it.

`publishStory` still demotes the previous lead, inserts a flash, bumps edition number. It must **not** clear the reporter mock interview (that field is reporter-owned). `draftsInProgress` may go to 0.

## Model pins (Cursor pool only)

Human instruction: no API models. Pins override the generic plan-feature-teams table.

| Role | Agent file | Model ID | Task slug |
|---|---|---|---|
| tech-lead | `.cursor/agents/tech-lead.md` | `grok-4.6` | `cursor-grok-4.6-high-fast` |
| backend-engineer | `.cursor/agents/backend-engineer.md` | `composer-2.5[]` | `composer-2.5-fast` |
| qa-reviewer | `.cursor/agents/qa-reviewer.md` | `grok-4.5` | `cursor-grok-4.5-high-fast` |

test-engineer (optional, tests inside `owns`): same as backend-engineer (`composer-2.5[]`). Parent chat stays Grok 4.6.

## Waves

### Wave W0 — Contracts and scaffold
- id: `W0`
- kind: `sequential`
- status: `pending`
- tracks: `contracts`
- isolation_default: `sequential`

#### Purpose

Create `api/` package, freeze route table + SQLite schema + env names, add `request()` on `frontend/src/api/client.ts`. Context7 Hono before adding the dependency.

#### Merge order

1. `contracts`

#### Goal test

`api/src/contract.ts` lists every row in the table above; `cd api && npm test` runs a contract self-check; `frontend/src/api/client.ts` exports `request` without changing `ApiError` / `clone` / `delay` signatures. Do not start a listen loop.

### Wave W1 — Parallel domain slices
- id: `W1`
- kind: `parallel`
- status: `complete`
- tracks: `auth`, `stories`, `karteset`, `circle`, `profile`
- isolation_default: `worktree`

#### Purpose

Each track implements its Hono router against the frozen schema **and** replaces the matching `frontend/src/api/core/*.ts` bodies with `request()` calls. Signatures unchanged.

#### Merge order

1. `auth`
2. `profile`
3. `karteset`
4. `circle`
5. `stories`

#### Goal test

All W1 tracks complete and `python3 scripts/check_feature_tracks.py docs/features/core-api/status.json` exits 0.

**Apply worktrees** in that merge order (`/apply-worktree`). Each W1 track commits on `agent/feature/core-api/<track-id>` after its goal test. If `main` is still unborn, W0's commit (now required) is the worktree base.

### Wave Wint — Integration
- id: `Wint`
- kind: `sequential`
- status: `complete`
- tracks: `integrate`
- isolation_default: `sequential`

#### Purpose

Mount routers, CORS + credentials, seed from frontend fixtures (not interview), optional Vite proxy. Shared freeze files may change here only.

#### Goal test

In-process Hono `app.request(...)` (no listen) hits `/health` and one route per W1 module. `cd frontend && npm run build` still passes. Core files do not import `mocks/`.

### Wave Wrev — Review
- id: `Wrev`
- kind: `sequential`
- status: `complete`
- tracks: `review`
- isolation_default: `sequential`

#### Purpose

Readonly `qa-reviewer` + feature goal test.

#### Goal test

The feature goal test above is true.

## Close

Closed 2026-08-18 after the feature goal test passed on Node 24 (`.nvmrc`): overlap OK, `cd api && npm test` 4/4, frontend lint + build exit 0, no `mocks` imports under `frontend/src/api/core/`, reporter interview still on the mock store.

What landed: a Hono + SQLite API in `api/` for the frozen route table; `frontend/src/api/core/` now calls `request()` instead of the in-memory mock. Reporter interviewing and the UI screens stayed out of this feature.

Merge order used: W0 `contracts` on `main`; W1 `auth` → `profile` → `karteset` → `circle` → `stories`; then Wint `integrate`; then Wrev `review`.

Follow-ups (not this close): reporter still mocked; `cff9f27` already patched `BottomNav.tsx`, `InterviewRoom.tsx`, and `LoginPage.tsx` after Wint so first real use does not crash. No next product version started.
