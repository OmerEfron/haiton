# Track — Circle (connections + invitations)

- id: `circle`
- wave: `W1`
- isolation: `worktree`
- owner_agents: backend-engineer
- branch: `agent/feature/core-api/circle`

## owns

- `api/src/circle/`
- `frontend/src/api/core/connections.ts`

## reads

- `api/src/contract.ts`
- `api/src/types.ts`
- `api/src/db.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/mocks/fixtures/connections.ts`
- `frontend/src/copy/common.ts` (section name map — read only)

## must_not

- `api/src/db.ts`
- `api/src/contract.ts`
- `api/src/types.ts`
- `api/package.json`
- `frontend/src/api/client.ts`
- `frontend/src/api/reporter/`
- `frontend/src/mocks/`
- `frontend/src/components/`
- `frontend/src/routes/`
- `frontend/src/copy/`

## Purpose

Implement the social-graph routes and un-mock `frontend/src/api/core/connections.ts`. Invitation `Invitation` responses still drop relation/section/note (wire type has no those fields).

## Implementation notes

- Routes: `GET /connections`, `GET /connections/summary`, `GET /connections/suggested`, `GET /invitations`, `POST /invitations`, `POST /invitations/:id/respond`, `DELETE /invitations/:id`, `PATCH /connections/:id`, `DELETE /connections/:id`, `GET /readers?q=`.
- `searchReaders`: blank `q` → `[]`. Filter by name/detail contains.
- `getCircleSummary.updatedThisWeek`: compute from data if cheap, else keep `3` as the mock did — pick one in this track and test it. Do not add schema columns.
- `sendInvitation` 400: `צריך לבחור קורא או להזין שם`. `respond` / connection 404: `ההזמנה לא נמצאה` / `החיבור לא נמצא`.
- Accept incoming invite inserts a `Connection` with `relation: "friend"`, `section: "friends"` as the mock.
- `cancelInvitation` is silent if missing.
- `updateConnection` has no UI caller but the route is in the contract — implement it.
- Session required except none of these are public. Tests on this router only.

## Goal test

Yes/no: tests for search-empty, send-invite 400, accept-incoming creates a connection, remove 404. `frontend/src/api/core/connections.ts` does not import `mocks`.

## Close notes

_Not started._
