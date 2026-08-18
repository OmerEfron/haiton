# Track — Invitation meta schema

- id: `schema`
- wave: `W0`
- isolation: `sequential`
- owner_agents: backend-engineer
- branch: `main`

## owns

- `api/src/schema.sql`

## reads

- `docs/features/desk-truth/PLAN.md`
- `api/src/circle/router.ts`

## must_not

- `api/src/circle/`
- `api/src/db.ts`
- `api/src/contract.ts`
- `api/src/types.ts`
- `api/package.json`
- `frontend/`

## Purpose

Add table `invitation_meta` so W1 `circle-invite` can persist relation/section/note/settings without changing the `Invitation` wire type.

## Implementation notes

- `CREATE TABLE IF NOT EXISTS` so existing `api/data/iton.sqlite` files pick it up on next open (new table, not ALTER).
- Primary key `(user_id, invitation_id)`.
- Columns: `relation TEXT NOT NULL DEFAULT 'friend'`, `section TEXT NOT NULL DEFAULT 'friends'`, `note TEXT`, `settings_json TEXT NOT NULL DEFAULT '{}'`.
- Optional FK to `invitations(user_id, id)` ON DELETE CASCADE if SQLite accepts the composite reference; skip the FK if it fails the existing schema style.
- Do not write routers. Do not migrate seed data.

## Goal test

Yes/no: `rg invitation_meta api/src/schema.sql` matches. `python3 scripts/check_feature_tracks.py docs/features/desk-truth/status.json` exits 0.

## Close notes

_Not started._
