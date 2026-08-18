import { complete } from "../llm.js";
import type { FactInput, NextQuestion, Turn } from "../types.js";
import { MAX_MESSAGES } from "../types.js";

const INSTRUCTIONS = `אתה עיתונאי בעיתון "העיתון". קראת מראש את כרטיסיית המרואיין ומקשיב לתשובות — לא שואל כמו זר.

המשימה: לצוד סיפור אחד. שאלה אחת בכל פעם, בעברית.

כללים:
- אם יש דיווח פתיחה — הקורא כבר סיפר מה הוא רוצה בעיתון. שאל המשך על **אותו** סיפור. אל תפתח בברכה, "מה נשמע", או "מה קרה השבוע".
- כל שאלה חייבת להכיל מילה קונקרטית מהכרטיסייה, מהדיווח הפתיחה, או מתשובה קודמת (שם, מקום, תפקיד, מספר, שם עצם).
- אסור שאלות כלליות: "מה נשמע", "איך היה השבוע", "ספר על עצמך", "מה חדש", "איך אתה מרגיש" ודומות.
- אל תחזור על מה שכבר נאמר. חפור לעומק — מה קרה, למי, מתי, איפה, מה ההימור.
- אם כבר יש במסלול התשובות מה/מי/מתי/איפה או הימור אנושי ברור — החזר {"question": "", "done": true}.
- אחרי 4 תשובות מהקורא הראיון נגמר — אל תשאל שאלה נוספת.

החזר JSON בלבד: {"question": "...", "done": false}`;

function formatTranscript(turns: Turn[]): string {
  if (turns.length === 0) {
    return "(עדיין אין שיחה)";
  }

  const parts: string[] = [];
  let qNum = 0;

  for (const t of turns) {
    if (t.question === "") {
      parts.push(`דיווח פתיחה של הקורא:\n${t.answer}`);
    } else {
      qNum += 1;
      parts.push(`ש${qNum}: ${t.question}\nת${qNum}: ${t.answer}`);
    }
  }

  return parts.join("\n\n");
}

function buildInput(facts: FactInput[], turns: Turn[]): string {
  const karteset = facts.map((f) => `- ${f.text}`).join("\n");
  const transcript = formatTranscript(turns);

  return `כרטיסייה:\n${karteset}\n\nשיחה עד כה:\n${transcript}\n\nתשובות מהקורא: ${turns.length}/${MAX_MESSAGES}`;
}

function parseResponse(text: string): NextQuestion {
  const match = text.trim().match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Failed to parse interviewer response: ${text}`);
  }

  const parsed = JSON.parse(match[0]) as { question?: unknown; done?: unknown };
  if (typeof parsed.done !== "boolean") {
    throw new Error(`Invalid done field in interviewer response: ${text}`);
  }

  const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
  return { question, done: parsed.done };
}

export async function nextQuestion(
  facts: FactInput[],
  turns: Turn[],
): Promise<NextQuestion> {
  if (turns.length >= MAX_MESSAGES) {
    return { question: "", done: true };
  }

  const output = await complete({
    instructions: INSTRUCTIONS,
    input: buildInput(facts, turns),
  });

  return parseResponse(output);
}
