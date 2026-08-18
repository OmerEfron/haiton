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
}

export type StoryBlock =
  | { kind: "paragraph"; text: string; leadIn?: string }
  | { kind: "quote"; text: string };

export interface Flash {
  id: string;
  time: string;
  text: string;
  storyId?: string;
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

export type ConnectionStatus = "connected" | "pending_them" | "pending_you";

export type RelationKind = "family" | "friend" | "work" | "neighbour" | "other";

export interface Connection {
  id: string;
  name: string;
  initial: string;
  relationLabel: string;
  relation: RelationKind;
  section: SectionId;
  sectionName: string;
  status: ConnectionStatus;
  storyCount: number;
  lastPublished?: string;
  settings: {
    seesMyEdition: boolean;
    showsFullName: boolean;
    notifyOnPublish: boolean;
  };
}

export interface Invitation {
  id: string;
  name: string;
  initial: string;
  detail: string;
  direction: "incoming" | "outgoing";
}

export interface ReaderSearchResult {
  id: string;
  name: string;
  initial: string;
  detail: string;
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
