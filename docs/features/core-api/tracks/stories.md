# Track — Stories, editions, flashes

- id: `stories`
- wave: `W1`
- isolation: `worktree`
- owner_agents: backend-engineer
- branch: `agent/feature/core-api/stories`

## owns

- `api/src/stories/`
- `frontend/src/api/core/stories.ts`

## reads

- `api/src/contract.ts`
- `api/src/types.ts`
- `api/src/db.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/mocks/fixtures/stories.ts`
- `frontend/src/mocks/fixtures/flashes.ts`

## must_not

- `api/src/db.ts`
- `api/src/contract.ts`
- `api/src/types.ts`
- `api/package.json`
- `frontend/src/api/client.ts`
- `frontend/src/api/reporter/`
- `frontend/src/mocks/`
- `frontend/src/components/`
- `frontend/src/routes/`
- `api/src/auth/`

## Purpose

Implement edition/story/flash routes and un-mock `frontend/src/api/core/stories.ts`. Publishing a ready `Draft` becomes the new lead + a flash and bumps `editionNumber`.

## Implementation notes

- Routes: `GET /editions/current`, `GET /stories/:id`, `GET /stories?section=`, `GET /flashes`, `POST /stories`.
- 404 Hebrew: `הידיעה לא נמצאה בארכיון`. Publish 400: `הטיוטה עדיין לא מוכנה לפרסום` when `status !== "ready"` or no headline.
- Lead demotion: previous `placement: "lead"` becomes `"secondary"`. Do **not** write interview/reporter tables.
- `openDraft` on the front page: `{ title, summary }` when `profile.stats.draftsInProgress > 0`, else `null`. Copy may stay as the mock teaser until reporter exists — freeze that string in this module if the schema has no draft row.
- Byline stays `כתב העיתון | שולחן העורכים`. First paragraph splits `leadIn` as the mock does.
- Auth: require session on all these routes (same cookie). Tests can insert a session row via frozen db helper.
- Frontend: same signatures; `listFlashes` still returns `{ flashes, dateShort }`.

## Goal test

Yes/no: handler tests for 404 story, list-by-section, publish demotes lead and increments edition. `frontend/src/api/core/stories.ts` does not import `mocks`.

## Close notes

Done on `agent/feature/core-api/stories` (`c2ccbe6`). Goal test passed. Router not mounted until Wint.
