# Track — User-first interviewer

- id: `interviewer-open`
- wave: `W1`
- isolation: `worktree`
- owner_agents: reporter-engineer
- branch: `agent/feature/reporter-wireup/interviewer-open`

## owns

- `ai-reporter/src/interviewer/`

## reads

- `docs/features/reporter-wireup/PLAN.md`
- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/persona.ts`
- `ai-reporter/src/fixtures/week-answers.ts`

## must_not

- `ai-reporter/src/types.ts`
- `ai-reporter/src/llm.ts`
- `ai-reporter/src/fixtures/`
- `ai-reporter/src/writer/`
- `ai-reporter/src/http/`
- `ai-reporter/src/contract.ts`
- `ai-reporter/src/run.ts`
- `ai-reporter/package.json`
- `ai-reporter/package-lock.json`
- `frontend/`
- `api/`

## Purpose

The first user text is a story they already want in the paper. `nextQuestion` asks follow-ups about **that** report, using karteset tokens. It does not open with a reporter greeting or a generic "what happened this week."

## Implementation notes

- Existing file: `ai-reporter/src/interviewer/interviewer.ts`. Keep `nextQuestion(facts, turns)` signature.
- Cap with `askedCount(turns)` from frozen `types.ts`, not `turns.length` (opening `{ question: "", answer }` must not eat a question slot).
- Prompt: when any turn has `question === ""`, that answer is the reader's initiating report. Follow-ups chase it. `buildInput` should label it as such (not "שאלה 1").
- Banned needles still apply. Each question still needs a concrete token from facts or answers (including the opening).
- Live test only in `ai-reporter/src/interviewer/interviewer.test.ts`. Budget **8**. One (maybe two) `nextQuestion(personaFacts, [{ question: "", answer: weekAnswers[0] }])`. Assert not generic, grounded on persona or that opening, Hebrew question, `done === false` unless the opening already has a full story (then `done` is allowed). Print `[llm] call`. Do not stub the SDK. Do not add this file to `npm test`.
- Do not change writer. Do not add HTTP.

## Goal test

Yes/no: `cd ai-reporter && node --env-file=../.env --env-file=.env --experimental-strip-types --test src/interviewer/interviewer.test.ts` exits 0 with `OPENAI_API_KEY` set. Stdout includes `[llm] call`. Total `responses.create` for the file **≤8**. `rg "turns.length >= MAX_QUESTIONS" ai-reporter/src/interviewer` is empty (uses `askedCount`). Question text does not match a `GENERIC_QUESTION_NEEDLES` entry.

## Close notes

Merged `ee0c2d0` → `main` as `20bd7aa`. `askedCount` caps follow-ups; live test 1/8 calls.
