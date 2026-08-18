# Feature plan — Simple AI reporter

- id: `ai-reporter`
- status: `planned`
- isolation_default: `worktree`
- base_branch: `main`

## Purpose

Give Haiton a real reporter, kept small: an **interviewer** that hunts one story in at most four questions, and a **writer** that turns the transcript into a standard-length Hebrew article in the tone and type the user picked. Quality of questions and prose is the feature. The desk mock stays until a later wire-up.

## Out of scope

- HTTP server, streaming, `POST /interviews`, swapping `frontend/src/api/reporter/`
- Tone/type picker UI, InterviewRoom changes, publish pipeline
- Writer choosing tone or type (user supplies both; writer chooses **angle** only)
- Multi-agent graphs, tools, RAG, fact-writing back to karteset
- New core API routes, frontend wire types, CSS/copy redesign
- A second Cursor OS or a product roadmap

## Frozen decisions (W0 writes types + LLM wrapper; later waves consume these)

1. **Two agents only.** `nextQuestion(facts, turns) → { question, done }` and `writeArticle({ facts, turns, tone, type }) → Article`. Orchestrator in Wint calls them in order. No third agent.
2. **Model.** OpenAI Responses API, model id `gpt-5.5` (`OPENAI_MODEL` may override). `openai` npm package. `client.responses.create({ model, instructions, input })`; use `output_text`. Confirm with Context7 `/websites/developers_openai_api` in W0. If the API rejects `gpt-5.5`, stop (`blocked_decision`) — do not silently switch models.
3. **Key.** `OPENAI_API_KEY` already in `.env`. Tests: `node --env-file=../.env --env-file=.env …` from `ai-reporter/`. Never commit `.env`. Fail closed if the key is missing.
4. **Quota.** The whole feature may spend **25** `responses.create` calls. One create = one message. No retry loops on live calls. Caps:
   - W0 `contracts`: **0**
   - W1 `interviewer`: **8** (typical 4)
   - W1 `writer`: **4** (typical 1)
   - Wint `integrate`: **8** (typical 5 = 4 questions + 1 article)
   - Wrev `review`: **5** (re-run e2e only)
   - Do **not** put W1 module tests on `npm test` (that would double-spend).
5. **Max 4 questions.** Interviewer may stop earlier (`done: true`) when the transcript already has a story (what / who / when / where, or a clear human stake). Never a 5th call.
6. **Questions are not generic.** Each question must contain a concrete token from karteset `facts[].text` or from a previous answer (name, place, role, number, proper noun). Banned needles (case-insensitive, Hebrew as written):

   `מה נשמע` · `מה שלומך` · `איך היה השבוע` · `איך עבר עליך השבוע` · `ספר לי על עצמך` · `קצת על עצמך` · `מה אתה עושה בחיים` · `יש משהו שתרצה לספר` · `יש משהו שאתה רוצה לשתף` · `מה חדש` · `איך אתה מרגיש` · `רוצה לשתף משהו` · `מה קרה השבוע`

   The interviewer reads the persona (karteset) and the answers so far. Follow-ups chase the story like a reporter who already did the homework.
7. **User picks tone + type.** Writer does not pick them. Angle is the writer's job.

   Tones (`ToneId` → label):
   - `factual` → עיתונאי ענייני — נקי, עובדתי, ישיר
   - `magazine` → מגזיני סיפורי — תיאורי, זורם, עם סצנות ו־storytelling
   - `witty` → קליל ושנון — הומור עדין, ניסוחים חדים, פחות פורמלי
   - `dramatic` → דרמטי — מדגיש מתח, קונפליקט ומשמעות
   - `intimate` → אישי ואינטימי — חם, קרוב לדמות, מתמקד ברגשות ובפרטים הקטנים

   Types (`ArticleTypeId` → label):
   - `news` → חדשותית — מה קרה, למי, מתי, איפה ולמה
   - `profile` → פרופיל — אדם דרך אישיות, הרגלים, חיים
   - `feature` → כתבת מגזין — סיפור רחב סביב נושא / תופעה / זווית אנושית
   - `interview` → ראיון — בנוי בעיקר סביב דברי המרואיין
   - `column` → טור / פרשנות — עמדה או נקודת מבט של הכותב
8. **Article size** (whitespace-separated Hebrew words, `paragraphs` joined): `news` 220–450; all others 350–700. Shape: `angle`, `headline`, `standfirst`, `paragraphs` (2–8). Invent nothing that is not in facts or turns. Hebrew only. Journalism terms: כותרת, כותרת משנה, זווית.
9. **Live tests only for model behavior.** Interviewer and writer tests **must** call `gpt-5.5`. Do not stub the SDK. Mechanical checks (enum completeness, quota throw) may run without a call. Print `[llm] call n/budget` on each create.
10. **Frozen live persona** (copy of `frontend/src/mocks/fixtures/facts.ts`, do not import it): עומר עפרון, 29, חיפה; אד־טק מאוגוסט 2024, ג׳וניור → ראש צוות מ-2026 עם מפתח אחד; אחות מיכל מתמחה בבית חולים; רץ בטיילת בת גלים ×3/שבוע.
11. **Frozen live week** (canned answers, in order). Q-follow-ups still come from the model; answers are fixed so parallel writer work does not wait on interviewer:
    1. השבוע נתן לראשונה שיחת משוב למפתח שהוא מנהל, ויצא מזה לא בטוח שזה היה בסדר.
    2. אחרי העבודה רץ בבת גלים וניסה לשחזר מה אמר — יותר מדי על הדדליין, פחות על מה שעבד.
    3. בערב התקשר למיכל; היא אמרה שגם בבית החולים המשוב הראשון מרגיש כמו בגידה קטנה בחבר.
    4. (only if asked) מחר הוא יושב איתו שוב, הפעם עם דוגמה אחת טובה לפני ההערה.
12. **Wint live combo:** tone `intimate`, type `feature`. Writer W1 live combo: tone `factual`, type `news`, using the four canned answers as if already interviewed (no interviewer calls).
13. **Desk mock stays.** Do not edit frontend reporter files.

## Goal test

Yes/no. All of these are true (do **not** start vite, `api` listen, or a reporter HTTP server):

1. `python3 scripts/check_feature_tracks.py docs/features/ai-reporter/status.json` exits 0
2. `cd ai-reporter && npm test` exits 0 — live e2e, `OPENAI_API_KEY` present, **≤5** `responses.create` calls, stdout includes `[llm] call`
3. E2e asked **1–4** questions; none match a banned needle; each question shares a token with the persona facts or a prior canned answer
4. Article `tone` is `intimate`, `type` is `feature`; `headline` + `standfirst` + 2–8 `paragraphs`; word count 350–700; Hebrew (no English body sentences)
5. `frontend/src/api/reporter/interview.ts` still imports `../../mocks/db`

## Commits

After **each track** goal test passes, commit (track branch, or `main` if sequential). After the wave collect, commit the `status.json` update. Required and allowed. Do not push unless asked. No secrets (`.env`).

## Model pins (Cursor pool for agents)

Human: product may call OpenAI `gpt-5.5`. Cursor **agents** stay on the pool. Pins override the generic plan-feature-teams table.

| Role | Agent file | Model ID | Task slug |
|---|---|---|---|
| tech-lead | `.cursor/agents/tech-lead.md` | `grok-4.6` | `cursor-grok-4.6-high-fast` |
| reporter-engineer | `.cursor/agents/reporter-engineer.md` | `composer-2.5[]` | `composer-2.5-fast` |
| qa-reviewer | `.cursor/agents/qa-reviewer.md` | `grok-4.5` | `cursor-grok-4.5-high-fast` |

Parent chat stays Grok 4.6.

## Waves

### Wave W0 — Contracts and LLM wrapper
- id: `W0`
- kind: `sequential`
- status: `pending`
- tracks: `contracts`
- isolation_default: `sequential`

#### Purpose

Create `ai-reporter/` package, freeze types/labels/banned needles/word bands, wrap Responses API + per-process budget. Zero live calls.

#### Merge order

1. `contracts`

#### Goal test

`ai-reporter/src/types.ts` and `ai-reporter/src/llm.ts` exist. `package-lock.json` includes `openai`. `.env.example` names `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.5`. `python3 scripts/check_feature_tracks.py docs/features/ai-reporter/status.json` exits 0. No `responses.create` in this wave.

### Wave W1 — Interviewer and writer
- id: `W1`
- kind: `parallel`
- status: `pending`
- tracks: `interviewer`, `writer`
- isolation_default: `worktree`

#### Purpose

Each agent against the frozen contract. Exclusive dirs. Exclusive quota slices.

#### Merge order

1. `interviewer`
2. `writer`

#### Goal test

All W1 tracks complete and `python3 scripts/check_feature_tracks.py docs/features/ai-reporter/status.json` exits 0.

**Apply worktrees** in that merge order (`/apply-worktree`). Each W1 track commits on `agent/feature/ai-reporter/<track-id>` after its goal test.

### Wave Wint — Integration
- id: `Wint`
- kind: `sequential`
- status: `pending`
- tracks: `integrate`
- isolation_default: `sequential`

#### Purpose

`runReporter({ facts, answers, tone, type })` = interviewer then writer. `npm test` is **only** the live e2e. Shared freeze (`package.json` test script) may change here.

#### Goal test

Feature goal test items 2–4 are true. Call count ≤5 for that `npm test` run.

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
