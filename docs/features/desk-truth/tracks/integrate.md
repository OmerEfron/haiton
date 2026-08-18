# Track — Integrate

- id: `integrate`
- wave: `Wint`
- isolation: `sequential`
- owner_agents: backend-engineer
- branch: `main`

## owns

- `api/src/seed.ts`
- `api/package.json`
- `api/src/app.integration.test.ts`
- `frontend/src/mocks/fixtures/profile.ts`

## reads

- `docs/features/desk-truth/PLAN.md`
- `api/src/auth/`
- `api/src/stories/`
- `api/src/circle/`
- `frontend/src/mocks/fixtures/stories.ts`
- `frontend/src/mocks/fixtures/flashes.ts`
- `frontend/src/mocks/fixtures/facts.ts`

## must_not

- `api/src/auth/`
- `api/src/stories/`
- `api/src/circle/`
- `api/src/schema.sql`
- `frontend/src/api/`
- `frontend/src/routes/`
- `frontend/src/components/`
- `reporter/`

## Purpose

Seed stats match seeded rows. `npm test` runs the domain tests W1 already wrote.

## Implementation notes

- `profileSeed.stats`: `storiesPublished: 6`, `flashes: 4`, `facts: 5`, `draftsInProgress: 0` (counts of current fixtures). Prefer deriving from the fixture arrays in `seed.ts` if that is fewer lines than duplicating numbers.
- `api/package.json` `test` script: keep the three app files and add `src/auth/auth.test.ts`, `src/stories/stories.test.ts`, `src/circle/circle.test.ts` (karteset/profile tests optional).
- Fix `app.integration.test.ts` only if seed changes break it. Story id `214` is a fixture id, not a count — leave it unless it fails.
- Do not start a listen loop. `cd frontend && npm run lint` and `npm run build`.

## Goal test

Yes/no: seed inserts those four stat values (or equivalent derived counts). `cd api && npm test` exits 0. `cd frontend && npm run lint` and `cd frontend && npm run build` exit 0.

## Close notes

Done. Seed `profile_stats` derived from fixture array lengths (6/4/5/0). `npm test` now runs auth, stories, and circle domain tests. Commit `0b84dc2`.
