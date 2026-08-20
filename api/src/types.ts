/* Core wire types — mirror of frontend/src/api/types.ts (core block + Session + Draft). */

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

export interface User {
  id: string;
  name: string;
  email: string;
  initial: string;
  age?: number;
  city?: string;
  headline?: string;
}

export interface EditionSettings {
  editionName: string;
  showEditionTag: boolean;
  interviewReminderAt: string | null;
}

export interface Profile {
  user: User;
  publishingSince: string;
  settings: EditionSettings;
  stats: {
    storiesPublished: number;
    flashes: number;
    facts: number;
    draftsInProgress: number;
  };
  sectionCounts: { label: string; detail: string }[];
  archive: string[];
  inviteToken: string;
}

export interface StoryAuthor {
  id: string;
  name: string;
  initial: string;
}

export interface Story {
  id: string;
  section: SectionId;
  sectionName: string;
  editionLabel: string;
  ownEdition: boolean;
  headline: string;
  standfirst: string;
  body: StoryBlock[];
  angle: string;
  byline: string;
  publishedAt: string;
  imageCaption?: string;
  placement: "lead" | "secondary" | "list";
  shareToken: string;
  hidden: boolean;
  author: StoryAuthor;
  gated?: boolean;
}

export interface SharedStory extends Story {
  gated: boolean;
  connected: boolean;
  pending: boolean;
  invitationId?: string;
}

export type StoryBlock =
  | { kind: "paragraph"; text: string; leadIn?: string }
  | { kind: "quote"; text: string };

export interface Flash {
  id: string;
  time: string;
  text: string;
  storyId?: string;
  shareToken?: string;
}

export interface FrontPage {
  editionNumber: number;
  dateLong: string;
  dateShort: string;
  editionName: string;
  ticker: string[];
  lead: Story | null;
  secondary: Story[];
  list: Story[];
  flashes: Flash[];
  digests: { section: SectionId; name: string; items: { id: string; headline: string }[] }[];
  openDraft: { title: string; summary: string } | null;
}

export type FactCategory = "personal" | "work" | "family" | "routine";

export interface Fact {
  id: string;
  category: FactCategory;
  text: string;
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

/** Standing file the reporter reads at interview start. */
export interface PersonBrief {
  subject: BriefSubject;
  facts: Fact[];
  circle: BriefCirclePerson[];
  recent: BriefRecentStory[];
}

export type ConnectionStatus = "connected" | "pending_them" | "pending_you";

export type RelationKind = "family" | "friend" | "work" | "neighbour" | "other";

export interface Connection {
  id: string;
  connectedUserId: string;
  name: string;
  initial: string;
  relationLabel: string;
  relation: RelationKind;
  section: SectionId;
  sectionName: string;
  status: ConnectionStatus;
  storyCount: number;
  lastPublished?: string;
}

export interface Invitation {
  id: string;
  name: string;
  initial: string;
  detail: string;
  direction: "incoming" | "outgoing";
  fromUserId?: string;
}

export interface InvitePreview {
  id: string;
  name: string;
  initial: string;
}

export interface JoinResult {
  connected: boolean;
  inviterId: string;
  invitationId?: string;
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
  pendingParagraph: string | null;
  checks: DraftChecks[];
  section: SectionId | null;
}

export interface Session {
  user: User;
  editionName: string;
}

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

/** Snapshot the reporter upserts; same wire shape as InterviewSession. */
export interface InterviewSnapshot {
  id: string;
  startedAt: string;
  elapsedLabel?: string;
  factsLocked?: number;
  angleChosen?: boolean;
  messages: { id?: string; role: string; text: string; at?: string }[];
  reporterTyping?: boolean;
  draft?: {
    headline?: string | null;
    status?: string;
  };
  openers?: string[];
  exhausted?: boolean;
  type?: string | null;
  tone?: string | null;
}
