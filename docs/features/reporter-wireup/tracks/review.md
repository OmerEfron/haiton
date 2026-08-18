# Track — Review

- id: `review`
- wave: `Wrev`
- isolation: `sequential`
- owner_agents: qa-reviewer
- branch: `main`

## owns

_(none — readonly)_

## reads

- `docs/features/reporter-wireup/`
- `ai-reporter/`
- `frontend/src/api/reporter/`
- `frontend/src/routes/InterviewRoom.tsx`

## must_not

- `ai-reporter/`
- `frontend/`
- `api/`
- `docs/features/reporter-wireup/status.json`

## Purpose

Readonly check that the feature goal test is true: user-first desk wire-up, live e2e, no mock reporter client.

## Implementation notes

- Run the feature goal test in PLAN.md. Do not start vite, `api` listen, or reporter listen.
- Honor the Wrev cap: **≤5** `responses.create` (re-run e2e only). Do not run the W1 interviewer live file.
- Flag any writes under a track `must_not`. You do not commit.

## Goal test

Yes/no: the PLAN.md feature goal test is true.

## Close notes

_Not started._
