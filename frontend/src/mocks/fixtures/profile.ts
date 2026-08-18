import type { Profile, User } from "../../api/types";

export const userSeed: User = {
  id: "u1",
  name: "עומר עפרון",
  email: "omer@example.com",
  initial: "ע",
  age: 29,
  city: "חיפה",
  headline: "מפתח ומוביל צוות",
};

export const profileSeed: Profile = {
  user: userSeed,
  publishingSince: "המהדורה שלו יוצאת מאז ינואר 2026",
  settings: {
    editionName: "המהדורה של עומר עפרון",
    showEditionTag: true,
    interviewReminderAt: "21:00",
  },
  stats: {
    storiesPublished: 6,
    flashes: 4,
    facts: 5,
    draftsInProgress: 0,
  },
  sectionCounts: [
    { label: "עבודה", detail: "61 ידיעות · מדור ראשי" },
    { label: "משפחה", detail: "44 ידיעות" },
    { label: "חברים", detail: "31 ידיעות" },
    { label: "אוכל · רגעים · חגיגות", detail: "78 ידיעות" },
  ],
  archive: ["אוג׳ 26", "יולי 26", "יוני 26", "מאי 26"],
};

export const editionSeed = {
  editionNumber: 212,
  dateLong: "יום שבת, 16 באוגוסט 2026",
  dateShort: "שבת, 16.08.26",
};
