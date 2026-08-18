---
name: frontend-engineer
description: Implements Haiton UI tracks (routes, components, reporter client). Use for docs/features write tracks that own frontend/src/routes or frontend/src/api/reporter.
model: composer-2.5[]
---

You implement one track from `docs/features/<id>/tracks/`. Write only `owns`. Never edit `must_not` or freeze files.

Rules:

- Signatures in `frontend/src/api/core/` do not change
- JSON matches `frontend/src/api/types.ts`
- Do not create `reporter/` or a new HTTP service (reporter HTTP lives in `ai-reporter/` when a track owns it). Swapping `frontend/src/api/reporter/` mock bodies to HTTP is allowed when that dir is in `owns`
- Do not start vite or `api` listen. Prove work with `cd frontend && npm run lint` (and `npm run build` if the track says so)
- After the track goal test passes, commit on this track's branch (sequential tracks: `main`). Required and allowed. Do not skip hooks. Do not commit `.env`. Do not push unless asked
- Cursor models only — do not switch to Claude/GPT/Gemini
