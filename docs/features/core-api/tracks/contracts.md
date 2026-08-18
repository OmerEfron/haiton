# Track — Contracts and API scaffold

- id: `contracts`
- wave: `W0`
- isolation: `sequential`
- owner_agents: backend-engineer
- branch: `main` (current checkout)

## owns

- `api/package.json`
- `api/package-lock.json`
- `api/tsconfig.json`
- `api/.env.example`
- `api/src/db.ts`
- `api/src/schema.sql`
- `api/src/types.ts`
- `api/src/contract.ts`
- `api/src/contract.test.ts`
- `frontend/.env.example`
- `frontend/src/api/client.ts`
- `.cursor/worktrees.json`

## reads

- `frontend/src/api/types.ts`
- `frontend/src/api/core/`
- `docs/features/core-api/PLAN.md`

## must_not

- `frontend/src/api/types.ts`
- `frontend/src/api/core/`
- `frontend/src/api/reporter/`
- `frontend/src/components/`
- `frontend/src/routes/`
- `frontend/package.json`
- `reporter/`

## Purpose

Freeze the HTTP contract the frontend already documented, scaffold `api/` so later tracks only add routers, and put a real `request()` helper in `client.ts` without un-mocking any domain file yet.

## Implementation notes

- Context7 `/honojs/hono` (and `@hono/node-server`) **before** writing `package.json` deps. Node 24: use `node:sqlite`, not a native sqlite addon.
- `api/src/types.ts` is a copy of **core** wire types only (stop before the reporter block in `frontend/src/api/types.ts`). Do not edit the frontend copy.
- `api/src/contract.ts` is the route table from PLAN.md (method, path, handler name). Tests assert the table is complete.
- Schema covers users, sessions, edition, stories, flashes, facts, connections, invitations, reader directory. Include columns needed for every W1 module so W1 does not alter `db.ts`.
- `request(path, init)` in `client.ts`: `VITE_API_URL`, `credentials: "include"`, parse `{ message }` into existing `ApiError`. Keep `delay`, `clone`, `nextId`, `ApiError` as they are (reporter still uses them).
- Env: `PORT=8787`, `DATABASE_PATH`, `SESSION_SECRET`, `VITE_API_URL=http://localhost:8787`. Document seed login.
- Append `npm ci --prefix api` to `.cursor/worktrees.json` `setup-worktree` (frontend line already there).
- `npm test` in api: `node --test` (or typescript strip) on `contract.test.ts` only. No listen loop. No `dev` server start.

## Goal test

Yes/no: `cd api && npm test` exits 0 and prints that every PLAN.md route is in `contract.ts`. `grep -n "export async function request" frontend/src/api/client.ts` finds the helper. `frontend/src/api/core/auth.ts` still imports `../../mocks/db`.

## Close notes

Done. Frozen 26 PLAN.md routes in `api/src/contract.ts`; `cd api && npm test` passes. Seed login `omer@example.com` / `iton-dev`. `request()` added to `client.ts`; core files still mock. No listen loop.
