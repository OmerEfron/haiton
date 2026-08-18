# Track — Review

- id: `review`
- wave: `Wrev`
- isolation: `sequential`
- owner_agents: qa-reviewer
- branch: `main`

## owns

- _(readonly — no writes)_

## reads

- `docs/features/core-api/`
- `api/`
- `frontend/src/api/`

## must_not

- `api/`
- `frontend/`
- `reporter/`
- `docs/features/core-api/status.json` (parent updates status after this track returns)

## Purpose

Readonly check that the feature goal test is actually true and that reporter/UI were not touched.

## Implementation notes

- Run the five checks in PLAN.md Goal test. Do not start vite or `api` listen.
- Flag any W1/Wint file that edited `components/`, `routes/`, or `api/reporter/`.
- Return pass/fail with evidence (command output). Do not implement fixes; parent assigns debugger/implementer if needed.

## Goal test

Yes/no: feature goal test in `PLAN.md` is true.

## Close notes

Feature goal test is true on this checkout (Node 24): overlap OK, `cd api && npm test` 4/4, frontend lint + build exit 0, no `mocks` imports under `frontend/src/api/core/`, reporter interview still on the mock store. Readonly reviewer sandbox failed `npm run build` with EPERM under `node_modules`; parent re-ran it writable and it passed. Flagged leftover: `cff9f27` edited `BottomNav.tsx`, `InterviewRoom.tsx`, and `LoginPage.tsx` (crash/login fixes) after Wint. Do not close the feature here.
