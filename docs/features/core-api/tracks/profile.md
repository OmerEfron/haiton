# Track — Profile and edition settings

- id: `profile`
- wave: `W1`
- isolation: `worktree`
- owner_agents: backend-engineer
- branch: `agent/feature/core-api/profile`

## owns

- `api/src/profile/`
- `frontend/src/api/core/profile.ts`

## reads

- `api/src/contract.ts`
- `api/src/types.ts`
- `api/src/db.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/mocks/fixtures/profile.ts`

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
- `api/src/auth/`

## Purpose

`GET /profile` and `PATCH /profile/edition-settings` against the frozen user/edition row. Un-mock `frontend/src/api/core/profile.ts`. Do not add "edit details" endpoints the UI does not call.

## Implementation notes

- Return the full `Profile` object (user, publishingSince, settings, stats, sectionCounts, archive). Stats are stored columns updated by other modules; this track only reads them.
- PATCH accepts `Partial<EditionSettings>` (`editionName`, `showEditionTag`, `interviewReminderAt`). If a session exists, keep `editionName` on the session view in sync.
- Session required. Tests on this router only. No listen.

## Goal test

Yes/no: GET profile matches seed shape keys; PATCH `showEditionTag` round-trips. `frontend/src/api/core/profile.ts` does not import `mocks`.

## Close notes

_Not started._
