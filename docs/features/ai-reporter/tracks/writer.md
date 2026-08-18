# Track — Writer

- id: `writer`
- wave: `W1`
- isolation: `worktree`
- owner_agents: reporter-engineer
- branch: `agent/feature/ai-reporter/writer`

## owns

- `ai-reporter/src/writer/`

## reads

- `docs/features/ai-reporter/PLAN.md`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/persona.ts`
- `ai-reporter/src/fixtures/week-answers.ts`

## must_not

- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/`
- `ai-reporter/src/interviewer/`
- `ai-reporter/package.json`
- `ai-reporter/package-lock.json`
- `frontend/`
- `api/`

## Purpose

A Hebrew writer that chooses the angle and writes to the user's tone and type. Standard newspaper length. No invented facts.

## Implementation notes

- Export `writeArticle({ facts, turns, tone, type }) → Article` from `ai-reporter/src/writer/writer.ts`. One `complete()` per article. `budget` = **4**.
- User supplies `tone` + `type` (labels from `types.ts`). Writer chooses `angle`. Body matches that tone/type. Hebrew only. Do not invent facts. Word band from `WORD_COUNT[type]`.
- Parse model output into `Article` (`headline`, `standfirst`, `paragraphs`, `angle`, echo `tone`/`type`). Prefer JSON in the prompt so parsing is boring.
- Live test `writer.test.ts`: persona + four canned answers as `turns` (pair dummy reporter questions that already contain בת גלים / מיכל / משוב / מפתח — the test is the article, not the questions). Call once with `tone: "factual"`, `type: "news"`. Assert word count 220–450, 2–8 paragraphs, non-empty headline/standfirst/angle, Hebrew (no ASCII sentence of 4+ English words). Print the article. **Do not stub OpenAI.**
- One live run. Fail closed without the key.
- Command: `cd ai-reporter && node --env-file=../.env --env-file=.env --experimental-strip-types --test src/writer/writer.test.ts`

## Goal test

Yes/no: that command exits 0. Stdout has `[llm] call` and at most 4 creates. Article asserts pass.

## Close notes

_Not started._
