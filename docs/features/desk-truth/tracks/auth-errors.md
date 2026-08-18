# Track — Auth errors

- id: `auth-errors`
- wave: `W1`
- isolation: `worktree`
- owner_agents: backend-engineer
- branch: `agent/feature/desk-truth/auth-errors`

## owns

- `api/src/auth/`

## reads

- `docs/features/desk-truth/PLAN.md`
- `api/src/contract.ts`
- `frontend/src/routes/LoginPage.tsx`

## must_not

- `api/src/db.ts`
- `api/src/contract.ts`
- `api/src/types.ts`
- `api/src/schema.sql`
- `api/package.json`
- `frontend/`

## Purpose

Sign-up with an existing email and the wrong password must not reuse the generic “need name, email, password” message. Login already prints `ApiError.message`.

## Implementation notes

- Frozen Hebrew string: `הדוא״ל הזה כבר רשום`.
- Keep: empty fields → existing `SIGN_UP_ERROR`. Same email + matching password → sign in (current catch path).
- Add a test in `auth.test.ts`. Do not add that file to `api/package.json` `test` (Wint).

## Goal test

Yes/no: `cd api && node --experimental-strip-types --test src/auth/auth.test.ts` exits 0. New case: existing user, wrong password on sign-up → 400 and the frozen Hebrew string.

## Close notes

_Not started._
