# Track — Circle invite truth

- id: `circle-invite`
- wave: `W1`
- isolation: `worktree`
- owner_agents: backend-engineer
- branch: `agent/feature/desk-truth/circle-invite`

## owns

- `api/src/circle/`

## reads

- `docs/features/desk-truth/PLAN.md`
- `api/src/schema.sql`
- `frontend/src/api/core/connections.ts`
- `frontend/src/components/circle/AddConnectionDialog.tsx`

## must_not

- `api/src/schema.sql`
- `api/src/db.ts`
- `api/src/contract.ts`
- `api/src/types.ts`
- `api/package.json`
- `frontend/`

## Purpose

Stop dropping the add-connection dialog payload. Stop returning hardcoded suggested people and `updatedThisWeek: 3`.

## Implementation notes

- `POST /invitations`: after inserting `invitations`, upsert `invitation_meta` from body `relation`, `section`, `note`, `settings`. Defaults: friend / friends / `{}`.
- `POST /invitations/:id/respond` accept: read meta; create connection with those relation/section/settings (label can stay `חדש במעגל` if none sent). Incoming-only, as today.
- `GET /connections/suggested`: readers whose name is not already a connection for this user. Empty array is fine. Delete `SUGGESTED_FROM_INTERVIEWS` if unused.
- `GET /connections/summary`: `updatedThisWeek` = count of this user's connections with `last_published IS NOT NULL`. Delete `UPDATED_THIS_WEEK`.
- `Invitation` JSON shape unchanged.
- Tests in `circle.test.ts`. Do not edit `api/package.json`.

## Goal test

Yes/no: `cd api && node --experimental-strip-types --test src/circle/circle.test.ts` exits 0. Cases: POST invitation with relation `family` + section `family`, accept → connection has those fields; suggested omits an already-connected name; summary `updatedThisWeek` is a count, not the literal `3` unless the count is actually 3.

## Close notes

_Not started._
