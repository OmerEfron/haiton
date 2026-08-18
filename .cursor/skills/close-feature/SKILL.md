---
name: close-feature
description: Close a planned feature after its goal test passes. Use only when the user runs /close-feature.
disable-model-invocation: true
---

# Close feature

Mark `docs/features/<id>/` complete. Default id: `core-api`. Do not implement leftover work. Do not start the app.

## 1. Select

Feature id from chat or the `in_progress` feature. Read `PLAN.md` goal test and `status.json`.

Stop if any wave is `pending` or `in_progress` unless the human explicitly skips leftover waves (mark those `skipped`).

Stop if `open_decisions` is non-empty.

## 2. Evidence

Run the **feature** goal test from PLAN.md:

1. `python3 scripts/check_feature_tracks.py docs/features/core-api/status.json`
2. `cd api && npm test`
3. `cd frontend && npm run lint` and `cd frontend && npm run build`
4. No `frontend/src/api/core/` import of `mocks/`
5. Reporter interview still mocked

If it fails, stop. Do not close.

qa-reviewer (readonly, `grok-4.5`) if not already done on Wrev.

## 3. Write

Set `status.json` `status` to `complete`, `current_wave` to the last completed wave, `last_updated` now.

Append close notes to PLAN.md (what landed, merge order used, follow-ups). Do not invent a next product version. Do not start reporter.

## 4. Stop

Do not start another feature. Do not `/execute-feature-wave`. Commit only if asked.
