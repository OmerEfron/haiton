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

export const DEFAULT_ACCEPT_SETTINGS = {
  seesMyEdition: true,
  showsFullName: true,
  notifyOnPublish: false,
} as const;
