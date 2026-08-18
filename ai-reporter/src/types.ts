export const MODEL = "gpt-5.5";

export const MAX_QUESTIONS = 4;

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
  news: { min: 220, max: 450 },
  profile: { min: 350, max: 700 },
  feature: { min: 350, max: 700 },
  interview: { min: 350, max: 700 },
  column: { min: 350, max: 700 },
};

export type FactInput = {
  id: string;
  category: string;
  text: string;
  usedInStories: number;
  updatedLabel?: string;
};

export type Turn = {
  question: string;
  answer: string;
};

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
