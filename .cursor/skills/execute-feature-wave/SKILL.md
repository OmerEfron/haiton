---
name: execute-feature-wave
description: Execute the next wave of a planned feature (parallel tracks in one message). Use only when the user runs /execute-feature-wave.
disable-model-invocation: true
---

# Execute feature wave

Run **one** wave from `docs/features/<id>/`. Feature id from chat, or the only feature with status `planned` / `in_progress`. Do not auto-start the next wave. Do not start vite or the API listen loop.

This repo uses **Cursor models only** (Grok 4.6, Grok 4.5, Composer 2.5) for agents. Do not pin Claude, GPT, or Gemini as the Cursor model. Product code in `ai-reporter/` may call OpenAI `gpt-5.5` when that feature's PLAN says so.

Checks (from `docs/features/<id>/MAP.md`):

- overlap: `python3 scripts/check_feature_tracks.py docs/features/<id>/status.json`
- frontend lint: `cd frontend && npm run lint`
- frontend build: `cd frontend && npm run build` (Wint/Wrev)
- api tests: `cd api && npm test` (after W0 if the wave says so)
- ai-reporter live: `cd ai-reporter && npm test` (Wint/Wrev of `ai-reporter` or `reporter-wireup`; needs `OPENAI_API_KEY`; honor PLAN call caps; do not also run W1 module live tests)
- ai-reporter contract: `cd ai-reporter && node --experimental-strip-types --test src/contract.test.ts` (W0 of `reporter-wireup`)
- ai-reporter http: `cd ai-reporter && node --experimental-strip-types --test src/http/http.test.ts` (W1 `http-session`; zero live LLM)

## 1. Select

Feature id is given (`/execute-feature-wave reporter-wireup`) or the only feature with status `planned` / `in_progress`. If several (e.g. leftover `ai-reporter` + new `reporter-wireup`), ask once — do not pick silently.

Read `docs/features/<id>/status.json` and `PLAN.md`.

Stop if `open_decisions` is non-empty or status is `blocked_decision`. Tell the human to decide, then re-run.

Stop if status is `complete`.

Worktree waves need a commit on `base_branch`. If HEAD is unborn (or the previous sequential track never committed), **commit the current checkout first**, then launch. Commits after each track are required and allowed.

## 2. Guard

```bash
python3 scripts/check_feature_tracks.py docs/features/<id>/status.json
```

Exit 0 required. Overlaps are a planning bug — do not "just run it."

Confirm Cursor Task/worktree APIs with Context7 `/websites/cursor` if the launch method is unclear.

## 3. Launch

**tech-lead** (`grok-4.6` / Task `cursor-grok-4.6-high-fast`) assigns from track briefs. Does not write product code.

Current wave = `current_wave` whose status is `pending` (or the in-progress wave if resuming).

### sequential

One team in the current checkout. Follow the single track brief. Implementer: track `owner_agents` — `backend-engineer`, `frontend-engineer`, or `reporter-engineer` (`composer-2.5[]` / Task `composer-2.5-fast`). Wrev: `qa-reviewer` readonly (`grok-4.5` / Task `cursor-grok-4.5-high-fast`).

### parallel

Launch **every** track in this wave in **one** parent message (multiple Task tool calls).

Per track, copy the brief verbatim into the Task prompt: `owns`, `reads`, `must_not`, goal test, existing check command. Subagents have no chat history.

| isolation | Task |
|---|---|
| `worktree` | `subagent_type: best-of-n-runner` (own branch + worktree). Branch `agent/feature/<id>/<track-id>`. Model `composer-2.5-fast` |
| `cloud` | `environment: cloud`, `cloud_base_branch` from status.json `base_branch` |
| `checkout` | domain implementer; only if owns stay disjoint |

In Multitask Mode set `run_in_background: true`.

Each implementer:

- Writes only `owns`
- Reads `reads`
- Never edits `must_not` or freeze files
- Runs the track goal test
- **Commits** on the track branch (or `main` if sequential) after the goal test passes. One commit per track. Message: why this track, not a file list. HEREDOC; do not skip hooks; do not commit secrets (`.env`, credentials). `.env.example` is fine. Do not push unless the human asked.
- Returns: files changed, commit hash, goal test evidence, leftover risk
- Does not start servers

Optional test-engineer per track if tests live inside `owns` — same Composer pin.

## 4. Collect

When all tracks return:

- Fail the wave if any track goal test failed. Resume that agent id if available.
- Do not `/apply-worktree` / merge cloud branches unless the human asked. Print merge order from PLAN.md.
- qa-reviewer only on `Wrev` (readonly).

Update `status.json`: completed tracks `complete`; wave `complete` only if every track in it is complete; point `current_wave` at the next pending wave but **do not start it**.

Then **commit** that status update on `main` (or the integration checkout). Sequential waves: track commit then status commit is fine if they are the same checkout — squash to one commit if nothing else changed. Parallel waves: each worktree already committed; parent commits only `status.json` (and PLAN close notes if any) on `main`.

## 5. Stop

- Do not start the next wave
- Do not start the app
- Do not push unless asked
