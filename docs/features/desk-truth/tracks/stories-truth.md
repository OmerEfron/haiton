# Track — Stories truth

- id: `stories-truth`
- wave: `W1`
- isolation: `worktree`
- owner_agents: backend-engineer
- branch: `agent/feature/desk-truth/stories-truth`

## owns

- `api/src/stories/`

## reads

- `docs/features/desk-truth/PLAN.md`
- `api/src/schema.sql`
- `frontend/src/api/types.ts`

## must_not

- `api/src/schema.sql`
- `api/src/db.ts`
- `api/src/contract.ts`
- `api/src/types.ts`
- `api/src/seed.ts`
- `api/package.json`
- `frontend/`

## Purpose

Stop serving frozen career-pivot draft copy. After publish, section digests and profile section counts must match the stories table.

## Implementation notes

- `GET /editions/current`: `openDraft` is null unless `open_draft_title` is non-null. Remove `FROZEN_OPEN_DRAFT` (delete the constant).
- `publishDraft`: after insert, rebuild `edition_state.digests_json` from this user's stories (same shape as `FrontPage.digests`: section, name, headline items). Rebuild `profile_meta.section_counts_json` from story counts per section. Keep existing lead demote / flash / ticker / edition bump / `drafts_in_progress = 0`.
- Do **not** increment `facts.used_in_stories` or `connections.story_count` (no mention extractor).
- Do not clear the reporter mock (API has no interview table). UI track clears the mock.
- Tests in `stories.test.ts`. Do not edit `api/package.json` or seed.

## Goal test

Yes/no: `cd api && node --experimental-strip-types --test src/stories/stories.test.ts` exits 0. Cases: front page with `drafts_in_progress > 0` but null open-draft columns → `openDraft === null`; publish a ready draft → new story is lead, digests include its headline, `section_counts_json` is non-empty.

## Close notes

Done. Removed `FROZEN_OPEN_DRAFT`; `openDraft` is null unless `open_draft_title` is set. Publish rebuilds digests and section counts from stories. Commit `d14a57f` on `agent/feature/desk-truth/stories-truth`.
