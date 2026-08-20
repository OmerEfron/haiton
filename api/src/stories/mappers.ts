import type { Draft, Flash, SectionId, Story, StoryBlock } from "../types.ts";

export const SECTION_NAMES: Record<SectionId, string> = {
  work: "עבודה",
  family: "משפחה",
  friends: "חברים",
  celebrations: "חגיגות",
  food: "אוכל",
  moments: "רגעים",
  flashes: "מבזקים",
};

export const MAIN_SECTION: SectionId = "work";
export const MAIN_SECTION_NAME = "ראשי";

export const BYLINE = "כתב העיתון | שולחן העורכים";
export const STORY_NOT_FOUND = "הידיעה לא נמצאה בארכיון";
export const DRAFT_NOT_READY = "הטיוטה עדיין לא מוכנה לפרסום";

export interface StoryRow {
  id: string;
  user_id: string;
  section: string;
  section_name: string;
  edition_label: string;
  headline: string;
  standfirst: string;
  body_json: string;
  angle: string;
  byline: string;
  published_at: string;
  image_caption: string | null;
  placement: string;
  share_token: string | null;
  hidden: number;
}

export interface FlashRow {
  id: string;
  time: string;
  text: string;
  story_id: string | null;
  share_token: string | null;
}

export function rowToStory(
  row: StoryRow,
  editionName: string,
  extra?: { author?: Story["author"]; gated?: boolean },
): Story {
  const story: Story = {
    id: row.id,
    section: row.section as SectionId,
    sectionName: row.section_name,
    editionLabel: row.edition_label,
    ownEdition: row.edition_label === editionName,
    headline: row.headline,
    standfirst: row.standfirst,
    body: JSON.parse(row.body_json) as StoryBlock[],
    angle: row.angle,
    byline: row.byline,
    publishedAt: row.published_at,
    imageCaption: row.image_caption ?? undefined,
    placement: row.placement as Story["placement"],
    shareToken: row.share_token ?? "",
    hidden: Boolean(row.hidden),
    author: extra?.author ?? { id: row.user_id, name: "", initial: "" },
  };
  if (extra?.gated) story.gated = true;
  return story;
}

export function rowToFlash(row: FlashRow): Flash {
  return {
    id: row.id,
    time: row.time,
    text: row.text,
    storyId: row.story_id ?? undefined,
    shareToken: row.share_token ?? undefined,
  };
}

export function paragraphsToBody(paragraphs: string[]): StoryBlock[] {
  return paragraphs.map((text, i) => {
    if (i !== 0) return { kind: "paragraph" as const, text };
    const [first, ...rest] = text.split(" ");
    return { kind: "paragraph" as const, leadIn: first, text: rest.join(" ") };
  });
}

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export function hebrewEditionDates(now = new Date()): { dateShort: string; dateLong: string } {
  const weekday = WEEKDAYS[now.getDay()] ?? "";
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  return {
    dateShort: `${weekday}, ${dd}.${mm}.${yy}`,
    dateLong: `יום ${weekday}, ${now.getDate()} ב${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
  };
}

export function nowPublishedAt(dateShort: string, now = new Date()): { time: string; full: string } {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const resolved = dateShort.trim() || hebrewEditionDates(now).dateShort;
  const datePart = resolved.split(", ")[1] ?? resolved;
  return { time: `${hh}:${mm}`, full: `${datePart}, ${hh}:${mm}` };
}

export function angleFromDraft(draft: Draft): string {
  return draft.angle?.split(" | ")[0] ?? "";
}
