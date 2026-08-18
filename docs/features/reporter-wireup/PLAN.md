# Feature plan — Reporter desk wire-up (user-first)

- id: `reporter-wireup`
- status: `in_progress`
- isolation_default: `worktree`
- base_branch: `main`

## Purpose

Put the real `ai-reporter` behind the existing `/interview` desk. The **reader speaks first** (what they want in the paper). The reporter then interviews (≤4 follow-ups) and writes a draft. Publish stays on the core API.

## Out of scope

- Tone/type picker UI (frozen defaults below)
- Streaming / SSE (`reporterTyping` stays a client pending flag around `fetch`)
- New routes in `api/`, karteset writes, auth on the reporter process
- Changing `frontend/src/api/types.ts` or interview function signatures
- CSS redesign, a second Cursor OS, a product roadmap
- Replacing writer prompts or the OpenAI model id

## Frozen decisions (W0 writes the contract; later waves consume it)

1. **User-first.** `POST /interviews` returns `messages: []` (no reporter opener). The first `POST .../messages` body `{ text }` is the reader's report. Only then does the reporter ask a question. Copy/UI already assume this (`desk.emptyFirstBody`, composer `"מה קרה?"`, opener chips). Ban auto-seeding `openingCold` / `openingWithBackground`.
2. **Opening turn.** Transcript seed is `{ question: "", answer: text }`. Empty `question` means "user opened." It does **not** count toward `MAX_QUESTIONS`. Helper `askedCount(turns)` lives in `types.ts` (W0). HTTP **never** calls `nextQuestion` with `turns.length === 0`.
3. **HTTP in `ai-reporter/`, not `api/`.** Port **8788**. CORS `FRONTEND_ORIGIN` default `http://localhost:5173`. No cookies, no auth. In-memory singleton session (same as today's `db.interview`). Tests use Hono `app.request` — **no listen loop**.
4. **JSON is the existing desk shape.** Responses are `InterviewSession` / `Draft` / `InterviewMessage` as in `frontend/src/api/types.ts`. Do not import frontend into `ai-reporter`. Duplicate the key list in `contract.ts`. Errors `{ message }` Hebrew, same `ApiError` parse as `client.ts`.
5. **Route table**

   | Method | Path | Handler |
   |---|---|---|
   | GET | `/health` | `health` |
   | GET | `/interviews` | `getCurrent` — 200 session or **204** |
   | POST | `/interviews` | `createInterview` — body `{ facts: FactInput[] }`; replaces current |
   | GET | `/interviews/:id` | `getInterview` |
   | POST | `/interviews/:id/messages` | `postMessage` — body `{ text: string }` |
   | POST | `/interviews/:id/draft` | `requestDraft` — `writeArticle` now |
   | PATCH | `/interviews/:id/draft/section` | `setDraftSection` — body `{ section: SectionId }` |
   | DELETE | `/interviews/:id` | `discardInterview` — 204 |

6. **Defaults.** `tone: "intimate"`, `type: "feature"` (same as the live e2e). No picker this feature. Constants `DEFAULT_TONE` / `DEFAULT_TYPE` in `types.ts`.
7. **Openers.** Copy the three chips from `interview-script.ts` into `contract.ts` `SESSION_OPENERS`: `"משהו קרה בעבודה"`, `"משהו קרה למישהו קרוב"`, `"רגע קטן מהיום — מבזק"`.
8. **Hebrew errors (exact):** `אין ראיון פתוח` (409), `אי אפשר לשלוח הודעה ריקה` (400), `ראיון לא נמצא` (404).
9. **Desk client.** Signatures in `frontend/src/api/reporter/interview.ts` stay. Bodies become `fetch` to `VITE_REPORTER_URL` (empty = same-origin, Vite proxy after Wint). `startSession`: `GET /interviews`, if 204 then `listFacts()` + `POST /interviews`. Stop importing `mocks/db` and `interview-script.ts`.
10. **Env.** `ai-reporter/.env.example`: keep `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.5`; add `PORT=8788`, `FRONTEND_ORIGIN=http://localhost:5173`. `frontend/.env.example`: add `VITE_REPORTER_URL=` (empty = proxy).
11. **Quota.** Whole feature **25** `responses.create` calls. One create = one message. No retry loops. Caps:
    - W0 `contracts`: **0**
    - W1 `interviewer-open`: **8** (typical 1–2 in the live module test)
    - W1 `http-session`: **0** (inject fake `nextQuestion` / `writeArticle`)
    - W1 `desk-client`: **0**
    - Wint `integrate`: **8** (typical 5 = 4 follow-ups + 1 article; opening is not an LLM call)
    - Wrev `review`: **5** (re-run e2e only)
    - Do **not** put W1 interviewer live tests on `npm test`.
12. **E2e meaning of `weekAnswers`.** `[0]` is the user's opening report. `[1]…` are answers to reporter follow-ups. `runReporter` must seed the opening turn before the first `nextQuestion`.
13. **Hono.** Context7 `/honojs/hono` (and `@hono/node-server`) in W0 before adding deps. Same pattern as `api/`: `createApp()`, CORS, no listen in tests. Listen file exists in W1 `http/` but is **not started** by agents.
14. **No streaming.** One JSON response per request. Draft fills on `requestDraft` or when the interviewer returns `done: true` (then HTTP may call `writeArticle` once and set `draft.status: "ready"`). Prefer: follow-up questions until `done`; auto-write only when `done && !question`; `requestDraft` always writes now.

## Goal test

Yes/no. All of these are true (do **not** start vite, `api` listen, or reporter listen):

1. `python3 scripts/check_feature_tracks.py docs/features/reporter-wireup/status.json` exits 0
2. `cd ai-reporter && npm test` exits 0 — live e2e, `OPENAI_API_KEY` present, **≤5** `responses.create`, stdout includes `[llm] call`
3. E2e: `weekAnswers[0]` is consumed as the opening (not as an answer to Q1). Follow-up questions are **1–4**; none match a banned needle; each shares a token with persona facts or a prior answer **including the opening**
4. Article `tone` is `intimate`, `type` is `feature`; word count 350–700; Hebrew
5. `frontend/src/api/reporter/interview.ts` does **not** import `mocks/db` or `interview-script`
6. Reporter HTTP contract test: `POST /interviews` session has `messages.length === 0`; after first `POST .../messages` the first message `role` is `"reader"`
7. `cd frontend && npm run lint` exits 0

## Commits

After **each track** goal test passes, commit (track branch, or `main` if sequential). After the wave collect, commit the `status.json` update. Required and allowed. Do not push unless asked. No secrets (`.env`).

## Model pins (Cursor pool for agents)

Human: product may call OpenAI `gpt-5.5`. Cursor **agents** stay on the pool.

| Role | Agent file | Model ID | Task slug |
|---|---|---|---|
| tech-lead | `.cursor/agents/tech-lead.md` | `grok-4.6` | `cursor-grok-4.6-high-fast` |
| reporter-engineer | `.cursor/agents/reporter-engineer.md` | `composer-2.5[]` | `composer-2.5-fast` |
| frontend-engineer | `.cursor/agents/frontend-engineer.md` | `composer-2.5[]` | `composer-2.5-fast` |
| qa-reviewer | `.cursor/agents/qa-reviewer.md` | `grok-4.5` | `cursor-grok-4.5-high-fast` |

Parent chat stays Grok 4.6.

## Waves

### Wave W0 — HTTP contract + user-first rules
- id: `W0`
- kind: `sequential`
- status: `complete`
- tracks: `contracts`
- isolation_default: `sequential`

#### Purpose

Freeze routes, JSON keys, opening-turn rule, env names, Hono deps. Zero live OpenAI calls. Zero listen.

#### Merge order

1. `contracts`

#### Goal test

`ai-reporter/src/contract.ts` lists every route in the table above. `askedCount` ignores empty questions. `DEFAULT_TONE` / `DEFAULT_TYPE` are `intimate` / `feature`. `cd ai-reporter && node --experimental-strip-types --test src/contract.test.ts` exits 0. Lockfile includes `hono`. No `responses.create` added this wave.

### Wave W1 — Parallel slices
- id: `W1`
- kind: `parallel`
- status: `pending`
- tracks: `interviewer-open`, `http-session`, `desk-client`
- isolation_default: `worktree`

#### Purpose

Exclusive modules against the frozen contract: interviewer treats the opening report as given; HTTP session maps desk JSON; desk client drops the mock.

#### Merge order

1. `interviewer-open`
2. `http-session`
3. `desk-client`

#### Goal test

All W1 tracks complete and `python3 scripts/check_feature_tracks.py docs/features/reporter-wireup/status.json` exits 0.

**Apply worktrees** in that merge order (`/apply-worktree`). Each W1 track commits on `agent/feature/reporter-wireup/<track-id>` after its goal test.

### Wave Wint — Integration
- id: `Wint`
- kind: `sequential`
- status: `pending`
- tracks: `integrate`
- isolation_default: `sequential`

#### Purpose

`runReporter` becomes user-first. `npm test` is that live e2e. Vite proxies `/interviews` → `:8788`. Shared freeze files may change here.

#### Goal test

Feature goal test items 2–7 are true. Call count ≤5 for that `npm test` run.

### Wave Wrev — Review
- id: `Wrev`
- kind: `sequential`
- status: `pending`
- tracks: `review`
- isolation_default: `sequential`

#### Purpose

Readonly `qa-reviewer` + feature goal test (re-runs e2e, ≤5 calls).

#### Goal test

The feature goal test above is true.
