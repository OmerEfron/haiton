# Track — Circle edit UI

- id: `circle-edit`
- wave: `W1`
- isolation: `worktree`
- owner_agents: frontend-engineer
- branch: `agent/feature/desk-truth/circle-edit`

## owns

- `frontend/src/routes/CirclePage.tsx`
- `frontend/src/components/circle/EditConnectionDialog.tsx`

## reads

- `docs/features/desk-truth/PLAN.md`
- `frontend/src/api/core/connections.ts`
- `frontend/src/components/circle/AddConnectionDialog.tsx`
- `frontend/src/copy/circle.ts`
- `frontend/src/copy/common.ts`

## must_not

- `frontend/src/components/circle/AddConnectionDialog.tsx`
- `frontend/src/api/types.ts`
- `frontend/src/api/core/`
- `frontend/src/router.tsx`
- `frontend/package.json`
- `api/`

## Purpose

Wire Circle “עריכה” / “ניהול” to existing `updateConnection`. No new route.

## Implementation notes

- New dialog, same visual language as `AddConnectionDialog` (relation chips, section chips, settings toggles). Smallest that can PATCH.
- Desktop Edit and mobile Manage both open it.
- On success: invalidate `qk.connections` (and summary if settings affect it).
- Do not restyle the table. Do not implement resend / share-link.

## Goal test

Yes/no: `cd frontend && npm run lint` exits 0. `CirclePage.tsx` Edit and Manage buttons have click handlers. `EditConnectionDialog.tsx` exists and calls `updateConnection`.

## Close notes

Done. Desktop Edit and mobile Manage open `EditConnectionDialog`, which calls `updateConnection`. Commit `7dba414` on `agent/feature/desk-truth/circle-edit`.
