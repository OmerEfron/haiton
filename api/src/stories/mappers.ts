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

export const FROZEN_OPEN_DRAFT = {
  title: "צומת קריירה: ניהול או חזרה ל-backend",
  summary: "טיוטה אחת ממתינה לאישור שלך. שלוש עובדות נעולות, זווית נבחרה.",
} as const;

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
}

export interface FlashRow {
  id: string;
  time: string;
  text: string;
  story_id: string | null;
}

export function rowToStory(row: StoryRow, editionName: string): Story {
  return {
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
  };
}

export function rowToFlash(row: FlashRow): Flash {
  return {
    id: row.id,
    time: row.time,
    text: row.text,
    storyId: row.story_id ?? undefined,
  };
}

export function paragraphsToBody(paragraphs: string[]): StoryBlock[] {
  return paragraphs.map((text, i) => {
    if (i !== 0) return { kind: "paragraph" as const, text };
    const [first, ...rest] = text.split(" ");
    return { kind: "paragraph" as const, leadIn: first, text: rest.join(" ") };
  });
}

export function nowPublishedAt(dateShort: string): { time: string; full: string } {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const datePart = dateShort.split(", ")[1] ?? dateShort;
  return { time: `${hh}:${mm}`, full: `${datePart}, ${hh}:${mm}` };
}

export function sectionNameFor(section: SectionId | null): string {
  return section ? SECTION_NAMES[section] : SECTION_NAMES.work;
}

export function angleFromDraft(draft: Draft): string {
  return draft.angle?.split(" | ")[0] ?? "";
}
