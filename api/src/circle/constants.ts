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

export const SELF_JOIN = "אי אפשר להצטרף למעגל של עצמך";
export const TOKEN_NOT_FOUND = "ההזמנה לא נמצאה";
export const CONNECTION_NOT_FOUND = "החיבור לא נמצא";
export const INVITE_NOT_FOUND = "ההזמנה לא נמצאה";
