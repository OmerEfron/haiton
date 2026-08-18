# Track — Karteset facts

- id: `karteset`
- wave: `W1`
- isolation: `worktree`
- owner_agents: backend-engineer
- branch: `agent/feature/core-api/karteset`

## owns

- `api/src/karteset/`
- `frontend/src/api/core/karteset.ts`

## reads

- `api/src/contract.ts`
- `api/src/types.ts`
- `api/src/db.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/mocks/fixtures/facts.ts`

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

## Purpose

CRUD for the reporter's standing background file (`Fact`) and un-mock `frontend/src/api/core/karteset.ts`.

## Implementation notes

- Routes: `GET/POST /karteset/facts`, `PATCH/DELETE /karteset/facts/:id`.
- Empty text → `אי אפשר לרשום עובדה ריקה` (400). Missing id → `העובדה לא נמצאה בכרטסת` (404).
- Add/remove bump `profile.stats.facts` (column on the frozen profile/user row — do not change schema).
- `usedInStories` starts at 0; `updatedLabel` `נרשם עכשיו` / `עודכן עכשיו`.
- Session required. Tests on this router only. No listen.

## Goal test

Yes/no: tests for list/add/update/delete and the two Hebrew errors. `frontend/src/api/core/karteset.ts` does not import `mocks`.

## Close notes

Done on `agent/feature/core-api/karteset` (`5614288`). Goal test passed. Router not mounted until Wint.
