# Track — Review

- id: `review`
- wave: `Wrev`
- isolation: `sequential`
- owner_agents: qa-reviewer
- branch: `main`

## owns

- _(readonly — no writes)_

## reads

- `docs/features/desk-truth/`
- `api/`
- `frontend/src/`

## must_not

- `api/`
- `frontend/`
- `reporter/`
- `docs/features/desk-truth/status.json` (parent updates status after this track returns)

## Purpose

Readonly check that the feature goal test in PLAN.md is actually true.

## Implementation notes

- Run the eight checks in PLAN.md Goal test. Do not start vite or `api` listen.
- Flag any track that edited `must_not` paths.
- Return pass/fail with evidence. Do not implement fixes.

## Goal test

Yes/no: feature goal test in `PLAN.md` is true.

## Close notes

Done. Feature goal test passed on `main` @ `7952b08`: overlap OK, `cd api && npm test` 22/22, frontend lint + build exit 0, no `FROZEN_OPEN_DRAFT` / `db.facts` / `interviewPeek`, Edit/Manage calls `updateConnection`, DraftPanel save does not `discardSession`. No `must_not` violations. Feature close not started.
