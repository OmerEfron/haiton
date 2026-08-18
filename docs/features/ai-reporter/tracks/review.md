# Track — Review

- id: `review`
- wave: `Wrev`
- isolation: `sequential`
- owner_agents: qa-reviewer
- branch: `main`

## owns

- _(readonly — no writes)_

## reads

- `docs/features/ai-reporter/`
- `ai-reporter/`
- `frontend/src/api/reporter/interview.ts`

## must_not

- `ai-reporter/`
- `frontend/`
- `api/`
- `docs/features/ai-reporter/status.json` (parent updates status after this track returns)

## Purpose

Readonly check that the feature goal test in PLAN.md is actually true.

## Implementation notes

- Run the five checks in PLAN.md Goal test. Live e2e spends ≤5 calls — do not also run W1 module tests.
- Do not start vite, `api` listen, or a reporter HTTP server.
- Flag any track that edited `must_not` paths.
- Return pass/fail with evidence. Do not implement fixes.

## Goal test

Yes/no: feature goal test in `PLAN.md` is true.

## Close notes

_Not started._
