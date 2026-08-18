# Feature plan — Desk truth (split-brain + bugs)

- id: `desk-truth`
- status: `in_progress`
- isolation_default: `worktree`
- base_branch: `main`

## Purpose

Make the live core API and the shipped UI tell the same story. Gap 2: screens that still overlay mock or frozen fixture copy on top of real routes. Gap 3: handlers that drop data, discard the wrong thing, or keep seed theater stats. Function signatures under `frontend/src/api/core/` stay. Wire JSON stays `frontend/src/api/types.ts`.

## Out of scope

- Reporter service (`reporter/`, LLM interview, streaming). The mock interview stays.
- Image uploads, notifications, email, SSO
- New HTTP routes (invitation extras are stored server-side; `Invitation` JSON unchanged)
- `updateConnection` already exists — only wire UI
- Fact `usedInStories` / connection `storyCount` bumps on publish (needs a mention extractor; reporter-owned)
- Dead buttons that have no API: edit profile details, resend invite, share link, edit draft by hand
- UI redesign, CSS, copy rewrites except the smallest string a track needs
- A second Cursor OS or a product roadmap

## Frozen decisions (W0 writes schema; later waves consume these)

1. **No fake draft.** `GET /editions/current` `openDraft` is `{ title, summary }` only when `open_draft_title` is non-null. Do not fall back to `FROZEN_OPEN_DRAFT`. Seed `drafts_in_progress = 0` and leave open-draft columns null.
2. **Draft UX is reporter-owned until reporter exists.** Front page teaser, profile `draftsInProgress` display, and the nav badge may peek `getSession()` from `frontend/src/api/reporter/interview.ts` for the in-memory interview. They must not invent API copy.
3. **Save draft** = keep the mock session + navigate home. Do **not** call `discardSession`. **Publish success** = `discardSession` then navigate to the story (core-api said publish must not clear the mock from the API; the UI now clears it).
4. **One interview query key.** `qk.interview` only. BottomNav and InterviewRoom share it. `qk.interviewPeek` may remain as an alias of the same tuple or be deleted.
5. **Invitation extras** live in new table `invitation_meta` (not in `Invitation` JSON). Columns: `user_id`, `invitation_id`, `relation`, `section`, `note`, `settings_json`. `POST /invitations` writes them. Accept uses them instead of hardcoded friend/friends.
6. **Suggested connections** = readers not already connected (by `connected_user_id` or name). Not the hardcoded Michal/Yonatan list (those people are already in the circle).
7. **`updatedThisWeek`** = `COUNT(*)` of this user's connections with `last_published IS NOT NULL`. Not the constant `3`.
8. **Seed stats** = row counts: 6 stories, 4 flashes, 5 facts, `draftsInProgress: 0`. Change `frontend/src/mocks/fixtures/profile.ts` (seed source) in Wint.
9. **Duplicate sign-up, wrong password** Hebrew error (freeze this string): `הדוא״ל הזה כבר רשום`. Matching password on an existing email may still sign in (current behavior).
10. **No new routes** in `api/src/contract.ts`.

## Goal test

Yes/no. All of these are true:

1. `python3 scripts/check_feature_tracks.py docs/features/desk-truth/status.json` exits 0
2. `cd api && npm test` exits 0 — includes domain tests after Wint
3. `cd frontend && npm run lint` and `cd frontend && npm run build` exit 0
4. `rg FROZEN_OPEN_DRAFT api/src/stories` is empty (constant removed or unused)
5. `rg "db.facts" frontend/src/api/reporter` is empty
6. `rg interviewPeek frontend/src` is empty (or it equals `qk.interview`)
7. Circle Edit/Manage opens a dialog that calls `updateConnection`
8. `DraftPanel` save button does not call `discardSession`

Do **not** start `vite` or the API listen loop to prove this.

## Commits

After **each track** goal test passes, commit (track branch, or `main` if sequential). After the wave collect, commit the `status.json` update. Required and allowed. Do not push unless asked. No secrets.

## Model pins (Cursor pool only)

Human instruction: no API models. Pins override the generic plan-feature-teams table.

| Role | Agent file | Model ID | Task slug |
|---|---|---|---|
| tech-lead | `.cursor/agents/tech-lead.md` | `grok-4.6` | `cursor-grok-4.6-high-fast` |
| backend-engineer | `.cursor/agents/backend-engineer.md` | `composer-2.5[]` | `composer-2.5-fast` |
| frontend-engineer | `.cursor/agents/frontend-engineer.md` | `composer-2.5[]` | `composer-2.5-fast` |
| qa-reviewer | `.cursor/agents/qa-reviewer.md` | `grok-4.5` | `cursor-grok-4.5-high-fast` |

test-engineer (optional, tests inside `owns`): same as backend-engineer (`composer-2.5[]`). Parent chat stays Grok 4.6.

## Waves

### Wave W0 — Invitation meta schema
- id: `W0`
- kind: `sequential`
- status: `complete`
- tracks: `schema`
- isolation_default: `sequential`

#### Purpose

Add `invitation_meta` to `schema.sql`. No routers, no UI.

#### Merge order

1. `schema`

#### Goal test

`invitation_meta` exists in `api/src/schema.sql`. `python3 scripts/check_feature_tracks.py docs/features/desk-truth/status.json` exits 0. Do not start a listen loop.

### Wave W1 — Parallel slices
- id: `W1`
- kind: `parallel`
- status: `complete`
- tracks: `auth-errors`, `circle-invite`, `stories-truth`, `interview-desk`, `circle-edit`
- isolation_default: `worktree`

#### Purpose

Each track fixes its exclusive module against the frozen decisions above.

#### Merge order

1. `auth-errors`
2. `stories-truth`
3. `circle-invite`
4. `circle-edit`
5. `interview-desk`

#### Goal test

All W1 tracks complete and `python3 scripts/check_feature_tracks.py docs/features/desk-truth/status.json` exits 0.

**Apply worktrees** in that merge order (`/apply-worktree`). Each W1 track commits on `agent/feature/desk-truth/<track-id>` after its goal test.

### Wave Wint — Integration
- id: `Wint`
- kind: `sequential`
- status: `pending`
- tracks: `integrate`
- isolation_default: `sequential`

#### Purpose

Align seed stats with row counts. Put domain API tests on `npm test`. Shared freeze files may change here only.

#### Goal test

Seed path writes `stories_published = 6`, `flashes = 4`, `facts = 5`, `drafts_in_progress = 0`. `cd api && npm test` exits 0 and runs auth/stories/circle tests. `cd frontend && npm run lint` and `cd frontend && npm run build` exit 0.

### Wave Wrev — Review
- id: `Wrev`
- kind: `sequential`
- status: `pending`
- tracks: `review`
- isolation_default: `sequential`

#### Purpose

Readonly `qa-reviewer` + feature goal test.

#### Goal test

The feature goal test above is true.

## Close

_Not started._
