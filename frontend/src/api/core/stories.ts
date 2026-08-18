/* CORE API — editions, stories and flashes.
 * Later: GET /editions/current, GET /stories/:id, POST /stories. */

import type { Draft, FrontPage, Story } from "../types";
import { ApiError, clone, delay, nextId } from "../client";
import { db } from "../../mocks/db";

/** Stories are numbered in the paper, so keep the sequence going. */
function nextStoryNumber(): string {
  const highest = db.stories.reduce((max, s) => {
    const n = Number(s.id);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return String(highest + 1);
}

function nowLabel(): { time: string; full: string } {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { time: `${hh}:${mm}`, full: `${db.edition.dateShort.split(", ")[1]}, ${hh}:${mm}` };
}

export async function getFrontPage(): Promise<FrontPage> {
  await delay(300);
  const stories = db.stories;
  return clone({
    editionNumber: db.edition.editionNumber,
    dateLong: db.edition.dateLong,
    dateShort: db.edition.dateShort,
    editionName: db.profile.settings.editionName,
    ticker: db.ticker,
    lead: stories.find((s) => s.placement === "lead") ?? null,
    secondary: stories.filter((s) => s.placement === "secondary"),
    list: stories.filter((s) => s.placement === "list"),
    flashes: db.flashes,
    digests: db.digests,
    openDraft:
      db.profile.stats.draftsInProgress > 0
        ? {
            title: "צומת קריירה: ניהול או חזרה ל-backend",
            summary: "טיוטה אחת ממתינה לאישור שלך. שלוש עובדות נעולות, זווית נבחרה.",
          }
        : null,
  });
}

export async function getStory(id: string): Promise<Story> {
  await delay(220);
  const story = db.stories.find((s) => s.id === id);
  if (!story) throw new ApiError("הידיעה לא נמצאה בארכיון", 404);
  return clone(story);
}

export async function listStories(section?: string): Promise<Story[]> {
  await delay(200);
  return clone(section ? db.stories.filter((s) => s.section === section) : db.stories);
}

export async function listFlashes(): Promise<{ flashes: typeof db.flashes; dateShort: string }> {
  await delay(200);
  return clone({ flashes: db.flashes, dateShort: db.edition.dateShort });
}

/** Publishing a finished draft: becomes the new lead story plus a flash. */
export async function publishStory(draft: Draft): Promise<Story> {
  await delay(700);
  if (draft.status !== "ready" || !draft.headline) {
    throw new ApiError("הטיוטה עדיין לא מוכנה לפרסום");
  }
  const { time, full } = nowLabel();
  const sectionName =
    draft.section === "moments" ? "רגעים" : draft.section === "flashes" ? "מבזקים" : "עבודה";

  const story: Story = {
    id: nextStoryNumber(),
    section: draft.section ?? "work",
    sectionName,
    editionLabel: db.profile.settings.editionName,
    ownEdition: true,
    headline: draft.headline,
    standfirst: draft.standfirst ?? "",
    body: draft.paragraphs.map((text, i) =>
      i === 0
        ? { kind: "paragraph" as const, leadIn: text.split(" ")[0], text: text.split(" ").slice(1).join(" ") }
        : { kind: "paragraph" as const, text },
    ),
    angle: draft.angle?.split(" | ")[0] ?? "",
    byline: "כתב העיתון | שולחן העורכים",
    publishedAt: full,
    placement: "lead",
    imageCaption: "placeholder",
  };

  // The outgoing lead is demoted rather than dropped.
  const previousLead = db.stories.find((s) => s.placement === "lead");
  if (previousLead) previousLead.placement = "secondary";

  db.stories.unshift(story);
  db.flashes.unshift({ id: nextId("f"), time, text: story.headline, storyId: story.id });
  db.ticker = [`ידיעה חדשה פורסמה: ${story.headline}`, ...db.ticker].slice(0, 5);
  db.edition.editionNumber += 1;
  db.profile.stats.storiesPublished += 1;
  db.profile.stats.flashes += 1;
  db.profile.stats.draftsInProgress = 0;
  db.interview = null;
  db.interviewBeat = 0;

  return clone(story);
}
