import { complete } from "../llm.js";
import { getLogger } from "../log/logger.js";
import type { FactInput, ProposedFact, Turn } from "../types.js";

const CATEGORIES = new Set(["personal", "work", "family", "routine"]);

const INSTRUCTIONS = `אתה עורך כרטסת בעיתון אישי. מהראיון חלץ עובדות קבועות בלבד — לא את אירוע השבוע.

כללים:
- מקסימום 3 עובדות. אם אין חדש — {"facts":[]}.
- עובדה קבועה: תפקיד, מקום מגורים, מי במשפחה, הרגל. לא «השבוע קרה ש…».
- אל תחזור על עובדה שכבר בכרטסת.
- עברית. קטגוריה אחת מ: personal, work, family, routine.

החזר JSON בלבד: {"facts":[{"text":"...","category":"work"}]}`;

function formatTurns(turns: Turn[]): string {
  return turns
    .map((t, i) => `${i + 1}. שאלה: ${t.question}\n   תשובה: ${t.answer}`)
    .join("\n\n");
}

export function filterProposed(existing: FactInput[], raw: ProposedFact[]): ProposedFact[] {
  const have = new Set(existing.map((f) => f.text.trim()));
  const out: ProposedFact[] = [];
  for (const item of raw) {
    const text = item.text.trim();
    const category = item.category.trim();
    if (!text || !CATEGORIES.has(category) || have.has(text)) continue;
    have.add(text);
    out.push({ text, category });
    if (out.length >= 3) break;
  }
  return out;
}

export function parseProposed(text: string): ProposedFact[] {
  const match = text.trim().match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { facts?: unknown };
    if (!Array.isArray(parsed.facts)) return [];
    return parsed.facts.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { text?: unknown; category?: unknown };
      if (typeof row.text !== "string" || typeof row.category !== "string") return [];
      return [{ text: row.text, category: row.category }];
    });
  } catch {
    return [];
  }
}

export async function proposeKarteset(
  facts: FactInput[],
  turns: Turn[],
): Promise<ProposedFact[]> {
  if (turns.length === 0) return [];
  const karteset = facts.map((f) => `- ${f.text}`).join("\n") || "(אין)";
  try {
    const output = await complete({
      instructions: INSTRUCTIONS,
      input: `כרטסת קיימת:\n${karteset}\n\nתמליל:\n${formatTurns(turns)}`,
    });
    return filterProposed(facts, parseProposed(output));
  } catch (err) {
    getLogger().warn({ event: "llm.propose_failed", err }, "karteset propose failed");
    return [];
  }
}
