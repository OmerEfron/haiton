import type { SectionId } from "../types.ts";

export const SECTION_NAMES: Record<SectionId, string> = {
  work: "עבודה",
  family: "משפחה",
  friends: "חברים",
  celebrations: "חגיגות",
  food: "אוכל",
  moments: "רגעים",
  flashes: "מבזקים",
};

/** Matches mock fixture — frozen constant for summary. */
export const UPDATED_THIS_WEEK = 3;

export const SUGGESTED_FROM_INTERVIEWS = [
  { id: "s1", name: "מיכל", initial: "מ", detail: "הוזכרה ב-4 ידיעות" },
  { id: "s2", name: "יונתן", initial: "י", detail: "הוזכר ב-3 ידיעות" },
] as const;

export const DEFAULT_ACCEPT_SETTINGS = {
  seesMyEdition: true,
  showsFullName: true,
  notifyOnPublish: false,
} as const;
