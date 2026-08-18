# Track — Desk client (drop the mock)

- id: `desk-client`
- wave: `W1`
- isolation: `worktree`
- owner_agents: frontend-engineer
- branch: `agent/feature/reporter-wireup/desk-client`

## owns

- `frontend/src/api/reporter/`
- `frontend/src/routes/InterviewRoom.tsx`
- `frontend/src/copy/desk.ts`

## reads

- `docs/features/reporter-wireup/PLAN.md`
- `frontend/src/api/types.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/core/karteset.ts`
- `frontend/src/api/core/stories.ts`

## must_not

- `frontend/src/api/types.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/core/`
- `frontend/src/mocks/`
- `frontend/src/router.tsx`
- `frontend/src/components/`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/.env.example`
- `ai-reporter/`
- `api/`

## Purpose

Point the desk at the reporter HTTP contract. The room opens empty; the reader sends the first message (composer or opener chips). Do not invent a reporter service package.

## Implementation notes

- Keep exported signatures: `startSession`, `getSession`, `sendMessage`, `requestDraft`, `setDraftSection`, `discardSession`.
- Fetch `VITE_REPORTER_URL` (default `""` = same origin). Reuse `ApiError` from `client.ts`. Do not edit `client.ts`. Parse `{ message }` the same way `request()` does — copy the few lines if you must not touch `client.ts`.
- `startSession`: `GET /interviews`; on 204, `listFacts()` then `POST /interviews` with `{ facts }`. Never seed a reporter opener.
- `getSession`: `GET /interviews`, 204 → `null` (BottomNav/FrontPage peek).
- `sendMessage` / `requestDraft` / `setDraftSection` / `discardSession` hit the frozen paths. `reporterTyping` can stay false in JSON; InterviewRoom already uses mutation `isPending` for the typing indicator.
- Stop importing `mocks/db` and `interview-script`. Do not delete those mock files.
- InterviewRoom: `firstInterview` already means "no reader messages." With empty `messages` the cold empty state + chips already show. Change only if a leftover assumes a reporter bubble exists. Do not restyle.
- Copy: drop reporter-first leftovers if they contradict user-first (e.g. `reporterSubtitle: "מראיין אותך על השבוע בעבודה"`). Keep `emptyFirstBody` / `composerLabel`. No redesign.
- Do not start vite. Prove with lint.

## Goal test

Yes/no: `cd frontend && npm run lint` exits 0. `rg "mocks/db|interview-script" frontend/src/api/reporter` is empty. `rg "openingCold|openingWithBackground" frontend/src/api/reporter frontend/src/routes/InterviewRoom.tsx` is empty. `startSession` / `getSession` / `sendMessage` are still exported.

## Close notes

_Not started._
