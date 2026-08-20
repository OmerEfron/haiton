export const MODEL = "gpt-5.5";

/** Reader turns per interview, then the reporter stops and writes a draft. */
export const MAX_MESSAGES = 4;

export const GENERIC_QUESTION_NEEDLES = [
  "מה נשמע",
  "מה שלומך",
  "איך היה השבוע",
  "איך עבר עליך השבוע",
  "ספר לי על עצמך",
  "קצת על עצמך",
  "מה אתה עושה בחיים",
  "יש משהו שתרצה לספר",
  "יש משהו שאתה רוצה לשתף",
  "מה חדש",
  "איך אתה מרגיש",
  "רוצה לשתף משהו",
  "מה קרה השבוע",
] as const;

export type ToneId = "factual" | "magazine" | "witty" | "dramatic" | "intimate";

export const TONE_LABELS: Record<ToneId, string> = {
  factual: "עיתונאי ענייני — נקי, עובדתי, ישיר",
  magazine: "מגזיני סיפורי — תיאורי, זורם, עם סצנות ו־storytelling",
  witty: "קליל ושנון — הומור עדין, ניסוחים חדים, פחות פורמלי",
  dramatic: "דרמטי — מדגיש מתח, קונפליקט ומשמעות",
  intimate: "אישי ואינטימי — חם, קרוב לדמות, מתמקד ברגשות ובפרטים הקטנים",
};

export type ArticleTypeId =
  | "news"
  | "profile"
  | "feature"
  | "interview"
  | "column";

export const TYPE_LABELS: Record<ArticleTypeId, string> = {
  news: "חדשותית — מה קרה, למי, מתי, איפה ולמה",
  profile: "פרופיל — אדם דרך אישיות, הרגלים, חיים",
  feature: "כתבת מגזין — סיפור רחב סביב נושא / תופעה / זווית אנושית",
  interview: "ראיון — בנוי בעיקר סביב דברי המרואיין",
  column: "טור / פרשנות — עמדה או נקודת מבט של הכותב",
};

export const WORD_COUNT: Record<ArticleTypeId, { min: number; max: number }> = {
  news: { min: 60, max: 180 },
  profile: { min: 90, max: 280 },
  feature: { min: 90, max: 280 },
  interview: { min: 90, max: 280 },
  column: { min: 90, max: 280 },
};

export type FactInput = {
  id: string;
  category: string;
  text: string;
  usedInStories: number;
  updatedLabel?: string;
};

export type BriefSubject = {
  name: string;
  city?: string;
  age?: number;
  headline?: string;
};

export type BriefCirclePerson = {
  name: string;
  relationLabel: string;
  sectionName: string;
};

export type BriefRecentStory = {
  headline: string;
  angle: string;
};

export type PersonBrief = {
  subject: BriefSubject;
  facts: FactInput[];
  circle: BriefCirclePerson[];
  recent: BriefRecentStory[];
};

export type ProposedFact = {
  text: string;
  category: string;
};

export function emptyBrief(name = ""): PersonBrief {
  return { subject: { name }, facts: [], circle: [], recent: [] };
}

export function briefFromFacts(facts: FactInput[], subjectName?: string): PersonBrief {
  return {
    subject: { name: subjectName?.trim() ?? "" },
    facts,
    circle: [],
    recent: [],
  };
}

export type Turn = {
  question: string;
  answer: string;
};

export const DEFAULT_TONE: ToneId = "intimate";
export const DEFAULT_TYPE: ArticleTypeId = "feature";

/** Reporter questions asked so far; empty question = user opened, not counted. */
export function askedCount(turns: Turn[]): number {
  return turns.filter((t) => t.question !== "").length;
}

export type NextQuestion = {
  question: string;
  done: boolean;
};

export type Article = {
  angle: string;
  headline: string;
  standfirst: string;
  paragraphs: string[];
  tone: ToneId;
  type: ArticleTypeId;
};
