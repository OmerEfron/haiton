import { complete } from "../llm.js";
import { getLogger } from "../log/logger.js";
import type {
  Article,
  ArticleTypeId,
  PersonBrief,
  ToneId,
  Turn,
} from "../types.js";
import { TONE_LABELS, TYPE_LABELS } from "../types.js";
import { formatWriteBrief } from "../brief.js";
import {
  forcedTypeBlock,
  forcedTypePickToneBlock,
  pickerBlock,
  SHARED_RULES,
} from "./machines.js";

type WriteArticleInput = {
  brief: PersonBrief;
  turns: Turn[];
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

function parseArticleOutput(
  text: string,
  pickType: boolean,
  pickTone: boolean,
): RawArticle {
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

  if (pickType) {
    if (typeof obj.type !== "string" || !TYPE_IDS.has(obj.type)) {
      throw new Error("Writer output missing type");
    }
    raw.type = obj.type as ArticleTypeId;
  }
  if (pickTone) {
    if (typeof obj.tone !== "string" || !TONE_IDS.has(obj.tone)) {
      throw new Error("Writer output missing tone");
    }
    raw.tone = obj.tone as ToneId;
  }

  return raw;
}

function formatTurns(turns: Turn[]): string {
  return turns
    .map(
      (t, i) =>
        `${i + 1}. שאלה: ${t.question}\n   תשובה: ${t.answer}`,
    )
    .join("\n\n");
}

export function buildWriterInput(brief: PersonBrief, turns: Turn[]): string {
  return `${formatWriteBrief(brief)}

תמליל ראיון (זה הסיפור):
${formatTurns(turns)}

כתוב את הכתבה.`;
}

function jsonShape(pickType: boolean, pickTone: boolean): string {
  const extra = [
    pickType ? `  "type": "news|profile|feature|interview|column"` : "",
    pickTone ? `  "tone": "factual|magazine|witty|dramatic|intimate"` : "",
  ]
    .filter(Boolean)
    .map((line) => `\n${line},`)
    .join("");
  return `החזר JSON בלבד, ללא markdown, ללא טקסט נוסף:
{${extra}
  "angle": "תיאור קצר של הזווית",
  "headline": "כותרת",
  "standfirst": "כותרת משנה",
  "paragraphs": ["פסקה 1", "פסקה 2"]
}`;
}

function formBlock(type?: ArticleTypeId, tone?: ToneId): string {
  if (type && tone) return forcedTypeBlock(type, tone);
  if (type) return forcedTypePickToneBlock(type);
  return pickerBlock(tone);
}

export function buildInstructions(type?: ArticleTypeId, tone?: ToneId): string {
  const pickType = type === undefined;
  const pickTone = tone === undefined;
  return `${SHARED_RULES}

${formBlock(type, tone)}

${jsonShape(pickType, pickTone)}`;
}

export async function writeArticle({
  brief,
  turns,
  tone,
  type,
}: WriteArticleInput): Promise<Article> {
  const pickType = type === undefined;
  const pickTone = tone === undefined;
  const instructions = buildInstructions(type, tone);
  const input = buildWriterInput(brief, turns);

  const output = await complete({ instructions, input });
  let raw: RawArticle;
  try {
    raw = parseArticleOutput(output, pickType, pickTone);
  } catch (err) {
    getLogger().warn(
      { event: "llm.parse_error", outputChars: output.length },
      "writer parse failed",
    );
    throw err;
  }

  return {
    angle: raw.angle,
    headline: raw.headline,
    standfirst: raw.standfirst,
    paragraphs: raw.paragraphs,
    tone: pickTone ? raw.tone! : tone!,
    type: pickType ? raw.type! : type!,
  };
}
