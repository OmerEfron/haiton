# Track — Interviewer

- id: `interviewer`
- wave: `W1`
- isolation: `worktree`
- owner_agents: reporter-engineer
- branch: `agent/feature/ai-reporter/interviewer`

## owns

- `ai-reporter/src/interviewer/`

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
- `ai-reporter/src/writer/`
- `ai-reporter/package.json`
- `ai-reporter/package-lock.json`
- `frontend/`
- `api/`

## Purpose

A Hebrew interviewer that already knows the karteset and listens to answers. At most four questions. No generic prompts.

## Implementation notes

- Export `nextQuestion(facts, turns) → { question: string, done: boolean }` from `ai-reporter/src/interviewer/interviewer.ts`. One `complete()` per question. `budget` = **8** for the live test process.
- Prompt: you are a human reporter for העיתון. You read the persona. You do not ask anything a stranger could ask. You hunt **one** story. Stop (`done: true`) when what/who/when/where or a clear stake is on the record, or after the 4th question.
- Live test `interviewer.test.ts`: load persona + week-answers. Loop: call `nextQuestion`, if `done` and no question, break; else record question, feed the next canned answer. Assert 1–4 questions; none include a `GENERIC_QUESTION_NEEDLES` needle; each question shares a ≥2-character token with facts or a previous answer (strip punctuation). Print questions. **Do not stub OpenAI.**
- One live run. If it fails, stop — do not re-call. Skip the test (fail) when `OPENAI_API_KEY` is unset.
- Command: `cd ai-reporter && node --env-file=../.env --env-file=.env --experimental-strip-types --test src/interviewer/interviewer.test.ts`

## Goal test

Yes/no: that command exits 0. Stdout has `[llm] call` and at most 8 creates. Questions pass the generic/grounding asserts.

## Close notes

Done on `agent/feature/ai-reporter/interviewer` (`8d73bad`). `nextQuestion` + live test; 4/8 `complete()` calls; questions grounded, no banned needles. Goal test exit 0. Worktree `interviewer-b0dff37f` — merge with `/apply-worktree` (order: interviewer, then writer).
