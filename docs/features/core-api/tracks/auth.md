# Track — Auth

- id: `auth`
- wave: `W1`
- isolation: `worktree`
- owner_agents: backend-engineer
- branch: `agent/feature/core-api/auth`

## owns

- `api/src/auth/`
- `frontend/src/api/core/auth.ts`

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
- `frontend/src/api/types.ts`
- `frontend/src/api/reporter/`
- `frontend/src/mocks/`
- `frontend/src/components/`
- `frontend/src/routes/`

## Purpose

Implement session cookie auth (`GET /auth/session`, `POST /auth/sign-in`, `POST /auth/sign-up`, `POST /auth/sign-out`) and point `frontend/src/api/core/auth.ts` at `request()`. Signatures stay.

## Implementation notes

- Export a Hono router (or `routes` array) from `api/src/auth/` — do not mount it in `app.ts` (Wint).
- Hebrew errors must match the mock: empty fields → `צריך דוא״ל וסיסמה כדי להיכנס` / `צריך שם, דוא״ל וסיסמה כדי לפתוח מהדורה`.
- Sign-up creates a user + default edition name `המהדורה של ${name}` and sets `user.initial` from the name.
- Session cookie `iton_session`. `getSession` returns `null` when missing (no auto-login).
- One `api/src/auth/*.test.ts` using in-process `app.request` on **this router only** plus the frozen db helper. Do not `listen`.
- Frontend file: drop `delay` / `db` imports; keep exported function names and `ApiError`.

## Goal test

Yes/no: `cd api && node --test api/src/auth` (or the repo's `npm test` glob) covers sign-in 400, sign-in 200 → `Session`, session cookie round-trip, sign-out. `frontend/src/api/core/auth.ts` does not import `mocks`.

## Close notes

_Not started._
