# Track — Interview desk

- id: `interview-desk`
- wave: `W1`
- isolation: `worktree`
- owner_agents: frontend-engineer
- branch: `agent/feature/desk-truth/interview-desk`

## owns

- `frontend/src/api/reporter/`
- `frontend/src/routes/InterviewRoom.tsx`
- `frontend/src/routes/FrontPage.tsx`
- `frontend/src/routes/ProfilePage.tsx`
- `frontend/src/components/interview/`
- `frontend/src/components/layout/BottomNav.tsx`
- `frontend/src/lib/queryKeys.ts`

## reads

- `docs/features/desk-truth/PLAN.md`
- `frontend/src/api/core/karteset.ts`
- `frontend/src/api/core/stories.ts`
- `frontend/src/api/core/profile.ts`
- `frontend/src/copy/desk.ts`
- `frontend/src/mocks/db.ts`

## must_not

- `frontend/src/mocks/db.ts`
- `frontend/src/mocks/fixtures/`
- `frontend/src/api/types.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/core/`
- `frontend/src/router.tsx`
- `frontend/package.json`
- `api/`

## Purpose

Point the mock interview at live karteset facts. Make save/publish/nav/front/profile agree on whether a draft exists.

## Implementation notes

- `startSession`: cold opener from `listFacts()` length, not `db.facts`. Still store the session on `db.interview`.
- Stop writing `db.profile.stats.draftsInProgress` (profile page does not read the mock profile).
- Save (`desk.saveDraft`): keep the session, navigate home, invalidate interview + front-page + profile queries. Do not call `discardSession`.
- Publish `onSuccess`: `await discardSession()` then existing invalidate + navigate to the story.
- One query key: `qk.interview`. BottomNav peeks `getSession` on that key (cached null is OK; InterviewRoom uses `startSession` on the same key — if that crashes again, use `placeholderData` / skip cache when `data === null && pathname === '/interview'`, do not split keys).
- Front page: if API `openDraft` is null, teaser from reporter `getSession()` when `draft.status !== "empty"` (title = headline or angle).
- Profile: display `draftsInProgress` as `1` when that peek has a non-empty draft, else the API number.
- Do not start a reporter HTTP service. Do not change copy unless a button was wired to the wrong handler only.

## Goal test

Yes/no: `cd frontend && npm run lint` exits 0. `rg "db.facts" frontend/src/api/reporter` is empty. `rg interviewPeek frontend/src` is empty (or alias of `qk.interview`). `DraftPanel` save path does not pass `discardSession`. `InterviewRoom` publish success calls `discardSession`.

## Close notes

_Not started._
