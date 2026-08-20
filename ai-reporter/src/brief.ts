import type { FactInput, PersonBrief } from "./types.js";

const CATEGORY_ORDER = ["personal", "work", "family", "routine"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  personal: "אישי",
  work: "עבודה",
  family: "משפחה",
  routine: "שגרה",
};

function subjectLine(brief: PersonBrief, inventName: boolean): string {
  const name = brief.subject.name.trim();
  if (!name) {
    return inventName
      ? "המרואיין: השם לא סופק."
      : "המרואיין: השם לא סופק. אל תמציא שם פרטי — כתוב בלי שם, או «המרואיין».";
  }
  const bits = [name];
  if (brief.subject.age != null) bits.push(`בן ${brief.subject.age}`);
  if (brief.subject.city) bits.push(brief.subject.city);
  if (brief.subject.headline) bits.push(brief.subject.headline);
  return `המרואיין: ${bits.join(" · ")}`;
}

function formatFactsByCategory(facts: FactInput[]): string {
  if (facts.length === 0) return "(אין עובדות בכרטסת)";
  const groups = new Map<string, FactInput[]>();
  for (const fact of facts) {
    const key = CATEGORY_LABEL[fact.category] ? fact.category : "personal";
    const list = groups.get(key) ?? [];
    list.push(fact);
    groups.set(key, list);
  }
  const blocks: string[] = [];
  for (const cat of CATEGORY_ORDER) {
    const list = groups.get(cat);
    if (!list?.length) continue;
    blocks.push(`${CATEGORY_LABEL[cat]}:\n${list.map((f) => `- ${f.text}`).join("\n")}`);
  }
  return blocks.join("\n");
}

export function formatInterviewBrief(brief: PersonBrief): string {
  const circle = brief.circle.length
    ? brief.circle.map((p) => `- ${p.name} — ${p.relationLabel}`).join("\n")
    : "(אין מעגל)";
  const recent = brief.recent.length
    ? brief.recent
        .map((s) => `- ${s.headline}${s.angle ? ` (${s.angle})` : ""}`)
        .join("\n")
    : "(אין ידיעות קודמות)";

  return `${subjectLine(brief, true)}

כרטיסייה לפי קטגוריה:
${formatFactsByCategory(brief.facts)}

מעגל:
${circle}

פורסם קודם:
${recent}`;
}

export function formatWriteBrief(brief: PersonBrief): string {
  const facts =
    brief.facts.length === 0
      ? "(אין)"
      : brief.facts.map((f) => `- ${f.text}`).join("\n");
  const headlines = brief.recent.map((s) => s.headline).filter(Boolean);
  const prior = headlines.length ? `\nפורסם קודם: ${headlines.join(" · ")}\n` : "";

  return `${subjectLine(brief, false)}

רקע (עובדות לבדיקה — לא למילוי אוטומטי):
${facts}
${prior}`;
}
