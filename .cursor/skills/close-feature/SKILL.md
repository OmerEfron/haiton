---
name: close-feature
description: Close a planned feature after its goal test passes. Use only when the user runs /close-feature.
disable-model-invocation: true
---

# Close feature

Mark `docs/features/<id>/` complete. Feature id from chat or the `in_progress` feature. Do not implement leftover work. Do not start the app.

This repo uses **Cursor models only** (Grok 4.6, Grok 4.5, Composer 2.5).

## 1. Select

Read `PLAN.md` goal test and `status.json`.

Stop if any wave is `pending` or `in_progress` unless the human explicitly skips leftover waves (mark those `skipped`).

Stop if `open_decisions` is non-empty.

## 2. Evidence

Run the **feature** goal test from PLAN.md. If it fails, stop. Do not close.

qa-reviewer (readonly, `grok-4.5`) if not already done on Wrev.

## 3. Write

Set `status.json` `status` to `complete`, `current_wave` to the last completed wave, `last_updated` now.

Append close notes to PLAN.md (what landed, merge order used, follow-ups). Do not invent a next product version. Do not start reporter.

## 4. Stop

Commit the close (`status.json` + PLAN notes) on `main`. Do not start another feature. Do not `/execute-feature-wave`. Do not push unless asked.
