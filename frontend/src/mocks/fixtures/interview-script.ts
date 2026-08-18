import type { Draft, SectionId } from "../../api/types";

/** One scripted reporter turn plus the state of the live draft once it lands. */
export interface ScriptBeat {
  reporter: { text: string; suggestions?: string[] };
  factsLocked: number;
  angleChosen: boolean;
  /** Patch merged into the running draft when this beat is delivered. */
  draft: Partial<Draft>;
  /** How long the typing indicator shows before this turn appears. */
  typingMs: number;
}

/** Chips offered before the first reader message (mockup 1f). */
export const openers = [
  "משהו קרה בעבודה",
  "משהו קרה למישהו קרוב",
  "רגע קטן מהיום — מבזק",
];

/** Opening reporter turn when the karteset already has background (1e). */
export const openingWithBackground =
  "בוקר טוב עומר. בכרטסת רשום שאתה עובד באד־טק מאוגוסט 2024. מה השתנה השבוע בתפקיד?";

/** Opening reporter turn on a first, empty interview (1f). */
export const openingCold =
  "שלום עומר. הכרטסת שלך עוד ריקה, אז נתחיל מהיום עצמו: מה קרה שכדאי לסקר?";

const checksEarly = [
  { label: "כל פסקה נשענת על עובדה שנאמרה (2/4)", done: true },
  { label: "ליד קיים · גוף בגוף שלישי", done: false },
  { label: "ללא ציטוט שלא נאמר", done: true },
  { label: "מדור ומיקום במהדורה — ממתין לך", done: false },
];

const checksFull = [
  { label: "כל פסקה נשענת על עובדה שנאמרה (4/4)", done: true },
  { label: "ליד קיים · גוף בגוף שלישי", done: true },
  { label: "ללא ציטוט שלא נאמר", done: true },
  { label: "מדור ומיקום במהדורה — ממתין לך", done: false },
];

export const beats: ScriptBeat[] = [
  {
    reporter: {
      text: "רגע, אני רושם. שני מפתחים ותשתיות AWS — מתי בדיוק זה הפך לרשמי?",
    },
    factsLocked: 2,
    angleChosen: false,
    typingMs: 900,
    draft: { status: "writing", angle: "מהג׳וניור לראש הצוות | טון: מאופק" },
  },
  {
    reporter: {
      text: "נעלתי שלוש עובדות. שאלה אחת לפני שאני מנסח: איך אתה מרגיש לגבי הצעד הבא — ניהול או חזרה ל-backend?",
      suggestions: ["עוד לא החלטתי", "נשאר בניהול", "חוזר ל-backend"],
    },
    factsLocked: 3,
    angleChosen: true,
    typingMs: 1100,
    draft: {
      status: "writing",
      headline: "עומר עפרון מונה לראש צוות פיתוח, שנתיים אחרי שנכנס כג׳וניור",
      checks: checksEarly,
    },
  },
  {
    reporter: {
      text: "זה בדיוק המשפט שהיה חסר לי. אני מנסח טיוטה — תראה אותה מתמלאת מימין.",
    },
    factsLocked: 4,
    angleChosen: true,
    typingMs: 1400,
    draft: {
      status: "writing",
      standfirst: "שני מפתחים, תשתיות AWS וצוות דאטה — והתלבטות על הצעד הבא.",
      paragraphs: [
        "חיפה. עומר עפרון, 29, מונה לראש צוות פיתוח בחברת אד־טק שבה הוא עובד מאוגוסט 2024.",
        "במהלך 2025 קיבל אחריות על מערכות backend, על צוות הדאטה ועל תשתיות AWS. בתחילת 2026 החל לנהל מפתח נוסף.",
      ],
      pendingParagraph: "הכתב ממשיך לכתוב פסקה שלישית…",
      checks: checksEarly,
    },
  },
  {
    reporter: {
      text: "הטיוטה מוכנה. בחר מדור מימין, ואם זה נראה לך — פרסם במהדורה. שום ידיעה לא עולה בלי אישור שלך.",
    },
    factsLocked: 4,
    angleChosen: true,
    typingMs: 1200,
    draft: {
      status: "ready",
      paragraphs: [
        "חיפה. עומר עפרון, 29, מונה לראש צוות פיתוח בחברת אד־טק שבה הוא עובד מאוגוסט 2024.",
        "במהלך 2025 קיבל אחריות על מערכות backend, על צוות הדאטה ועל תשתיות AWS. בתחילת 2026 החל לנהל מפתח נוסף.",
        "בקיץ 2026 החל עפרון לשקול מחדש את הצעד הבא: להישאר בניהול או להתמקד בהנדסת backend. ההחלטה, לדבריו, עוד לא נופלת.",
      ],
      pendingParagraph: null,
      checks: checksFull,
      section: "work" as SectionId,
    },
  },
];

/** Reporter fallback once the script runs out. */
export const afterScript =
  "רשמתי. אם יש עוד משהו מהשבוע — ספר, ואוסיף אותו לטיוטה לפני הפרסום.";

/** Sections offered under the draft. */
export const draftSections: { id: SectionId; name: string }[] = [
  { id: "work", name: "עבודה" },
  { id: "moments", name: "רגעים" },
  { id: "flashes", name: "מבזק" },
];
