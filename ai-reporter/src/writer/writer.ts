import { complete } from "../llm.js";
import type {
  Article,
  ArticleTypeId,
  FactInput,
  ToneId,
  Turn,
} from "../types.js";
import { TONE_LABELS, TYPE_LABELS, WORD_COUNT } from "../types.js";

type WriteArticleInput = {
  facts: FactInput[];
  turns: Turn[];
  tone: ToneId;
  type: ArticleTypeId;
};

type RawArticle = {
  angle: string;
  headline: string;
  standfirst: string;
  paragraphs: string[];
};

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function parseArticleOutput(text: string): RawArticle {
  const json = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Writer output is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Writer output must be a JSON object");
  }

  const obj = parsed as Record<string, unknown>;
  const { angle, headline, standfirst, paragraphs } = obj;

  if (typeof angle !== "string" || !angle.trim()) {
    throw new Error("Writer output missing angle");
  }
  if (typeof headline !== "string" || !headline.trim()) {
    throw new Error("Writer output missing headline");
  }
  if (typeof standfirst !== "string" || !standfirst.trim()) {
    throw new Error("Writer output missing standfirst");
  }
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    throw new Error("Writer output missing paragraphs");
  }
  if (!paragraphs.every((p) => typeof p === "string" && p.trim())) {
    throw new Error("Writer paragraphs must be non-empty strings");
  }

  return {
    angle: angle.trim(),
    headline: headline.trim(),
    standfirst: standfirst.trim(),
    paragraphs: paragraphs.map((p) => (p as string).trim()),
  };
}

function formatFacts(facts: FactInput[]): string {
  return facts.map((f) => `- ${f.text}`).join("\n");
}

function formatTurns(turns: Turn[]): string {
  return turns
    .map(
      (t, i) =>
        `${i + 1}. שאלה: ${t.question}\n   תשובה: ${t.answer}`,
    )
    .join("\n\n");
}

export async function writeArticle({
  facts,
  turns,
  tone,
  type,
}: WriteArticleInput): Promise<Article> {
  const wordBand = WORD_COUNT[type];
  const toneLabel = TONE_LABELS[tone];
  const typeLabel = TYPE_LABELS[type];

  const instructions = `אתה כותב עיתונאי ישראלי. כתוב כתבה בעברית בלבד.

כללים:
- אל תמציא עובדות שלא מופיעות ברקע או בראיון.
- בחר זווית (angle) אחת ברורה לכתבה.
- כותרת (headline), כותרת משנה (standfirst), וגוף (paragraphs).
- חובה: ${wordBand.min}–${wordBand.max} מילים בגוף בלבד (paragraphs מחוברות) — ספירת מילים מופרדות ברווח. לא פחות מ-${wordBand.min} ולא יותר מ-${wordBand.max}.
- 2–8 פסקאות בגוף.
- טון: ${toneLabel}
- סוג: ${typeLabel}
- עברית בלבד. אל תשתמש במשפטים באנגלית.

לפני שאתה מחזיר — ספור מילים בגוף. אם מחוץ לטווח, כתוב מחדש עד שבטווח.

החזר JSON בלבד, ללא markdown, ללא טקסט נוסף:
{
  "angle": "תיאור קצר של הזווית",
  "headline": "כותרת",
  "standfirst": "כותרת משנה",
  "paragraphs": ["פסקה 1", "פסקה 2"]
}`;

  const input = `רקע (עובדות):
${formatFacts(facts)}

תמליל ראיון:
${formatTurns(turns)}

כתוב את הכתבה.`;

  const output = await complete({ instructions, input, budget: 4 });
  const raw = parseArticleOutput(output);

  return {
    angle: raw.angle,
    headline: raw.headline,
    standfirst: raw.standfirst,
    paragraphs: raw.paragraphs,
    tone,
    type,
  };
}
