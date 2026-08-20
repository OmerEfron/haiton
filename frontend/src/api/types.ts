/* Domain types shared by the UI and by both future backends.
 * These are the wire shapes: when the real APIs land, they should return
 * exactly these objects, and nothing in src/components or src/routes changes. */

export type SectionId =
  | "work"
  | "family"
  | "friends"
  | "celebrations"
  | "food"
  | "moments"
  | "flashes";

export interface Section {
  id: SectionId;
  name: string;
}

/* ---------------------------------------------------------------- core API */

export interface User {
  id: string;
  name: string;
  email: string;
  /** Single Hebrew letter shown in the square avatar tiles. */
  initial: string;
  age?: number;
  city?: string;
  /** e.g. "מפתח ומוביל צוות" */
  headline?: string;
}

export interface EditionSettings {
  /** Appears under the logo: "המהדורה של עומר עפרון" */
  editionName: string;
  /** Show which edition each story came from. */
  showEditionTag: boolean;
  /** Daily nudge from the reporter, HH:mm, or null when off. */
  interviewReminderAt: string | null;
}

export interface Profile {
  user: User;
  /** Reusable token; frontend builds `/join/${inviteToken}`. */
  inviteToken: string;
  /** "המהדורה שלו יוצאת מאז ינואר 2026" */
  publishingSince: string;
  settings: EditionSettings;
  stats: {
    storiesPublished: number;
    flashes: number;
    facts: number;
    draftsInProgress: number;
  };
  sectionCounts: { label: string; detail: string }[];
  /** Month labels for the archive strip. */
  archive: string[];
}

export interface StoryAuthor {
  id: string;
  name: string;
  initial: string;
}

export interface Story {
  id: string;
  shareToken: string;
  author: StoryAuthor;
  /** True when the viewer only gets the teaser. */
  gated?: boolean;
  section: SectionId;
  sectionName: string;
  /** Which edition published it — "המהדורה שלך", "המהדורה של מיכל". */
  editionLabel: string;
  /** True when the signed-in reporter published it. */
  ownEdition: boolean;
  headline: string;
  standfirst: string;
  /** Paragraphs; a `quote` block renders as the red-ruled blockquote. */
  body: StoryBlock[];
  /** The reporter's chosen angle, shown as a chip on the story page. */
  angle: string;
  byline: string;
  publishedAt: string;
  /** Placeholder caption until real images exist. */
  imageCaption?: string;
  /** Front-page slot the story occupies. */
  placement: "lead" | "secondary" | "list";
  /** Hidden stories stay in the archive and at `/s/:token`, not the edition. */
  hidden?: boolean;
}

export type StoryBlock =
  | { kind: "paragraph"; text: string; leadIn?: string }
  | { kind: "quote"; text: string };

export interface Flash {
  id: string;
  time: string;
  text: string;
  /** Set when the flash was created by publishing a story. */
  storyId?: string;
  shareToken?: string;
}

/** GET /stories/share/:token — story plus circle flags. */
export interface SharedStory extends Story {
  connected: boolean;
  pending: boolean;
  invitationId?: string;
}

export interface InvitePreview {
  id: string;
  name: string;
  initial: string;
}

/** POST /invitations/join — invite token or story share token. */
export interface JoinResult {
  connected: boolean;
  inviterId: string;
  invitationId?: string;
}

export interface FrontPage {
  editionNumber: number;
  /** "יום שבת, 16 באוגוסט 2026" */
  dateLong: string;
  /** "שבת, 16.08.26" */
  dateShort: string;
  editionName: string;
  /** The rolling "עכשיו" ticker items. */
  ticker: string[];
  lead: Story | null;
  secondary: Story[];
  list: Story[];
  flashes: Flash[];
  /** Section digests in the lower grid of 1a. */
  digests: { section: SectionId; name: string; items: { id: string; headline: string }[] }[];
  /** The "בעריכה" teaser, or null when no draft is open. */
  openDraft: { title: string; summary: string } | null;
}

export type FactCategory = "personal" | "work" | "family" | "routine";

export interface Fact {
  id: string;
  category: FactCategory;
  text: string;
  /** "שימש ב-9 ידיעות" */
  usedInStories: number;
  updatedLabel?: string;
}

export interface BriefSubject {
  name: string;
  city?: string;
  age?: number;
  headline?: string;
}

export interface BriefCirclePerson {
  name: string;
  relationLabel: string;
  sectionName: string;
}

export interface BriefRecentStory {
  headline: string;
  angle: string;
}

export interface PersonBrief {
  subject: BriefSubject;
  facts: Fact[];
  circle: BriefCirclePerson[];
  recent: BriefRecentStory[];
}

export interface ProposedFact {
  text: string;
  category: FactCategory;
}

export type ConnectionStatus = "connected" | "pending_them" | "pending_you";

export type RelationKind = "family" | "friend" | "work" | "neighbour" | "other";

export interface Connection {
  id: string;
  connectedUserId: string;
  name: string;
  initial: string;
  /** Free text: "אחות", "מפתח בצוות". */
  relationLabel: string;
  relation: RelationKind;
  /** Section their mentions land in. */
  section: SectionId;
  sectionName: string;
  status: ConnectionStatus;
  storyCount: number;
  /** "פרסום אחרון אתמול" */
  lastPublished?: string;
}

export interface Invitation {
  id: string;
  name: string;
  initial: string;
  /** "מבקשת חיבור · נשלח לפני שעתיים" */
  detail: string;
  /** incoming = they asked to join your circle; outgoing = you invited them. */
  direction: "incoming" | "outgoing";
  fromUserId?: string;
}

/* ----------------------------------------------------- reporter agent API */

export type InterviewRole = "reporter" | "reader";

export type ToneId = "factual" | "magazine" | "witty" | "dramatic" | "intimate";

export type ArticleTypeId =
  | "news"
  | "profile"
  | "feature"
  | "interview"
  | "column";

export interface InterviewMessage {
  id: string;
  role: InterviewRole;
  text: string;
  /** Quick replies offered under a reporter turn. */
  suggestions?: string[];
  at: string;
}

export interface DraftChecks {
  label: string;
  done: boolean;
}

export interface Draft {
  id: string;
  status: "empty" | "writing" | "ready";
  angle: string | null;
  headline: string | null;
  standfirst: string | null;
  paragraphs: string[];
  /** Rendered in --muted while the reporter is still typing. */
  pendingParagraph: string | null;
  checks: DraftChecks[];
  section: SectionId | null;
}

export interface InterviewSession {
  id: string;
  startedAt: string;
  /** Minutes elapsed, shown in the interview room header. */
  elapsedLabel: string;
  factsLocked: number;
  angleChosen: boolean;
  messages: InterviewMessage[];
  /** True while the reporter "types" its next turn. */
  reporterTyping: boolean;
  draft: Draft;
  /** Offered as opening chips when the conversation is empty (mockup 1f). */
  openers: string[];
  /** No more turns — reporter stopped and wrote (or was asked to write) a draft. */
  exhausted: boolean;
  /** null = Auto. Filled with the resolved id after the draft is written. */
  type: ArticleTypeId | null;
  /** null = Auto. Filled with the resolved id after the draft is written. */
  tone: ToneId | null;
  /** Skip the real reporter model; placeholder questions and drafts. */
  testMode?: boolean;
  /** Standing facts locked when this interview started. */
  facts?: { id: string; category: FactCategory; text: string }[];
  /** Standing facts the reporter offers to file after the draft. */
  proposedFacts?: ProposedFact[];
}

/** Reader turns after which the reporter stops and writes a draft. */
export const MAX_INTERVIEW_MESSAGES = 4;

export interface Quota {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export interface InterviewListItem {
  id: string;
  startedAt: string;
  headline: string | null;
  exhausted: boolean;
}

export interface Session {
  user: User;
  editionName: string;
}
