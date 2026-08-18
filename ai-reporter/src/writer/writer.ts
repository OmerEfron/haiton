import { complete } from "../llm.js";
import type {
  Article,
  ArticleTypeId,
  FactInput,
  ToneId,
  Turn,
} from "../types.js";
import { TONE_LABELS, TYPE_LABELS } from "../types.js";
import { forcedTypeBlock, pickerBlock, SHARED_RULES } from "./machines.js";

type WriteArticleInput = {
  facts: FactInput[];
  turns: Turn[];
  subjectName?: string;
  tone?: ToneId;
  type?: ArticleTypeId;
};

type RawArticle = {
  angle: string;
  headline: string;
  standfirst: string;
  paragraphs: string[];
  tone?: ToneId;
  type?: ArticleTypeId;
};

const TONE_IDS = new Set(Object.keys(TONE_LABELS));
const TYPE_IDS = new Set(Object.keys(TYPE_LABELS));

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function asNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Writer output missing ${label}`);
  }
  return value.trim();
}

function parseArticleOutput(text: string, pickForm: boolean): RawArticle {
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
  const paragraphs = obj.paragraphs;
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    throw new Error("Writer output missing paragraphs");
  }
  if (!paragraphs.every((p) => typeof p === "string" && p.trim())) {
    throw new Error("Writer paragraphs must be non-empty strings");
  }

  const raw: RawArticle = {
    angle: asNonEmptyString(obj.angle, "angle"),
    headline: asNonEmptyString(obj.headline, "headline"),
    standfirst: asNonEmptyString(obj.standfirst, "standfirst"),
    paragraphs: paragraphs.map((p) => (p as string).trim()),
  };

  if (pickForm) {
    if (typeof obj.type !== "string" || !TYPE_IDS.has(obj.type)) {
      throw new Error("Writer output missing type");
    }
    if (typeof obj.tone !== "string" || !TONE_IDS.has(obj.tone)) {
      throw new Error("Writer output missing tone");
    }
    raw.type = obj.type as ArticleTypeId;
    raw.tone = obj.tone as ToneId;
  }

  return raw;
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

export function buildWriterInput(
  facts: FactInput[],
  turns: Turn[],
  subjectName?: string,
): string {
  const name = subjectName?.trim();
  const who = name
    ? `המרואיין: ${name}`
    : "המרואיין: השם לא סופק. אל תמציא שם פרטי — כתוב בלי שם, או «המרואיין».";

  return `${who}

רקע (עובדות לבדיקה — לא למילוי אוטומטי):
${formatFacts(facts)}

תמליל ראיון (זה הסיפור):
${formatTurns(turns)}

כתוב את הכתבה.`;
}

function jsonShape(pickForm: boolean): string {
  const extra = pickForm
    ? `\n  "type": "news|profile|feature|interview|column",\n  "tone": "factual|magazine|witty|dramatic|intimate",`
    : "";
  return `החזר JSON בלבד, ללא markdown, ללא טקסט נוסף:
{${extra}
  "angle": "תיאור קצר של הזווית",
  "headline": "כותרת",
  "standfirst": "כותרת משנה",
  "paragraphs": ["פסקה 1", "פסקה 2"]
}`;
}

export function buildInstructions(type?: ArticleTypeId, tone?: ToneId): string {
  const pickForm = type === undefined || tone === undefined;
  const form = pickForm
    ? pickerBlock()
    : forcedTypeBlock(type, tone);
  return `${SHARED_RULES}

${form}

${jsonShape(pickForm)}`;
}

export async function writeArticle({
  facts,
  turns,
  subjectName,
  tone,
  type,
}: WriteArticleInput): Promise<Article> {
  const pickForm = type === undefined || tone === undefined;
  const instructions = buildInstructions(type, tone);
  const input = buildWriterInput(facts, turns, subjectName);

  const output = await complete({ instructions, input });
  const raw = parseArticleOutput(output, pickForm);

  return {
    angle: raw.angle,
    headline: raw.headline,
    standfirst: raw.standfirst,
    paragraphs: raw.paragraphs,
    tone: pickForm ? raw.tone! : tone,
    type: pickForm ? raw.type! : type,
  };
}
