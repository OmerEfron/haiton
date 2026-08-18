import type { Connection, Invitation, ReaderSearchResult } from "../../api/types";

export const connectionsSeed: Connection[] = [
  {
    id: "c1",
    name: "מיכל עפרון",
    initial: "מ",
    relationLabel: "אחות",
    relation: "family",
    section: "family",
    sectionName: "משפחה",
    status: "connected",
    storyCount: 22,
    lastPublished: "פרסום אחרון אתמול",
    settings: { seesMyEdition: true, showsFullName: true, notifyOnPublish: true },
  },
  {
    id: "c2",
    name: "יונתן לוי",
    initial: "י",
    relationLabel: "חבר",
    relation: "friend",
    section: "friends",
    sectionName: "חברים",
    status: "connected",
    storyCount: 9,
    lastPublished: "פרסום אחרון 14.08",
    settings: { seesMyEdition: true, showsFullName: true, notifyOnPublish: false },
  },
  {
    id: "c3",
    name: "רונית עפרון",
    initial: "ר",
    relationLabel: "אמא",
    relation: "family",
    section: "family",
    sectionName: "משפחה",
    status: "connected",
    storyCount: 14,
    lastPublished: "מהדורה משלה",
    settings: { seesMyEdition: true, showsFullName: true, notifyOnPublish: true },
  },
  {
    id: "c4",
    name: "דניאל בר־און",
    initial: "ד",
    relationLabel: "מפתח בצוות",
    relation: "work",
    section: "work",
    sectionName: "עבודה",
    status: "connected",
    storyCount: 3,
    settings: { seesMyEdition: true, showsFullName: false, notifyOnPublish: false },
  },
];

export const invitationsSeed: Invitation[] = [
  {
    id: "i1",
    name: "נועה שגב",
    initial: "נ",
    detail: "מבקשת חיבור · נשלח לפני שעתיים",
    direction: "incoming",
  },
  {
    id: "i2",
    name: "אורי כהן — הזמנה שאתה שלחת",
    initial: "א",
    detail: "ממתין לתשובה · נשלח ב-13.08 לטלפון ‎054-0000000",
    direction: "outgoing",
  },
];

/** Directory the 2b search box queries. */
export const readerDirectory: ReaderSearchResult[] = [
  {
    id: "r1",
    name: "נועה שגב",
    initial: "נ",
    detail: "מהדורה פעילה · חיפה · 3 חיבורים משותפים",
  },
  { id: "r2", name: "נועם שריד", initial: "נ", detail: "מהדורה פעילה · תל אביב" },
  { id: "r3", name: "תמר אביב", initial: "ת", detail: "מהדורה פעילה · ירושלים · חיבור משותף אחד" },
  { id: "r4", name: "אורי כהן", initial: "א", detail: "מהדורה פעילה · חיפה" },
];

/** People the reporter noticed in past interviews (empty-state suggestions, 2c). */
export const suggestedFromInterviews = [
  { id: "s1", name: "מיכל", initial: "מ", detail: "הוזכרה ב-4 ידיעות" },
  { id: "s2", name: "יונתן", initial: "י", detail: "הוזכר ב-3 ידיעות" },
];
