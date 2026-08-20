/** Frozen HTTP contract from docs/features/reporter-wireup/PLAN.md (W0). */

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RouteContract {
  method: HttpMethod;
  path: string;
  handler: string;
  notes?: string;
}

export const ROUTES: readonly RouteContract[] = [
  { method: "GET", path: "/health", handler: "health" },
  {
    method: "GET",
    path: "/interviews",
    handler: "getCurrent",
    notes: "200 session or 204",
  },
  {
    method: "POST",
    path: "/interviews",
    handler: "createInterview",
    notes: "body: { brief?: PersonBrief; facts?: FactInput[]; subjectName?: string; testMode?: boolean }; replaces current",
  },
  { method: "GET", path: "/interviews/:id", handler: "getInterview" },
  {
    method: "POST",
    path: "/interviews/:id/messages",
    handler: "postMessage",
    notes: "body: { text: string }",
  },
  {
    method: "POST",
    path: "/interviews/:id/draft",
    handler: "requestDraft",
    notes: "writeArticle now",
  },
  {
    method: "PATCH",
    path: "/interviews/:id/draft/section",
    handler: "setDraftSection",
    notes: "body: { section: SectionId }",
  },
  {
    method: "PATCH",
    path: "/interviews/:id/form",
    handler: "setArticleForm",
    notes: "body: { type?: ArticleTypeId | null, tone?: ToneId | null }; null is auto",
  },
  {
    method: "DELETE",
    path: "/interviews/:id",
    handler: "discardInterview",
    notes: "204",
  },
] as const;

/** Stable key for deduping routes in tests. */
export function routeKey(route: Pick<RouteContract, "method" | "path">): string {
  return `${route.method} ${route.path}`;
}

/** Opening chips offered before the first reader message. */
export const SESSION_OPENERS = [
  "משהו קרה בעבודה",
  "משהו קרה למישהו קרוב",
  "רגע קטן מהיום — מבזק",
] as const;

/** Hebrew error messages — exact copy from PLAN.md. */
export const ERROR_NO_OPEN_INTERVIEW = "אין ראיון פתוח";
export const ERROR_EMPTY_MESSAGE = "אי אפשר לשלוח הודעה ריקה";
export const ERROR_NO_TRANSCRIPT = "אין תמליל — ספרו לכתב מה קרה קודם";
export const ERROR_INTERVIEW_NOT_FOUND = "ראיון לא נמצא";
export const ERROR_INTERVIEW_CLOSED = "הראיון הסתיים";
export const ERROR_INVALID_FORM = "בחירה לא חוקית";
export const ERROR_UNAUTHORIZED = "יש להתחבר כדי להמשיך";
export const ERROR_RATE_LIMIT = "יותר מדי בקשות. נסו שוב בעוד רגע.";
export const ERROR_LLM = "הכתב לא הצליח לנסח תשובה. נסו שוב.";
export const ERROR_INTERNAL = "משהו השתבש בשולחן העורכים";

/** HTTP status codes paired with the Hebrew errors above. */
export const ERROR_STATUS = {
  noOpenInterview: 409,
  emptyMessage: 400,
  noTranscript: 400,
  interviewNotFound: 404,
  interviewClosed: 409,
  invalidForm: 400,
  unauthorized: 401,
  llm: 502,
} as const;

/** Wire keys for InterviewMessage (matches frontend/src/api/types.ts). */
export const INTERVIEW_MESSAGE_KEYS = [
  "id",
  "role",
  "text",
  "suggestions",
  "at",
] as const;

/** Wire keys for Draft (matches frontend/src/api/types.ts). */
export const DRAFT_KEYS = [
  "id",
  "status",
  "angle",
  "headline",
  "standfirst",
  "paragraphs",
  "pendingParagraph",
  "checks",
  "section",
] as const;

/** Wire keys for InterviewSession (matches frontend/src/api/types.ts). */
export const INTERVIEW_SESSION_KEYS = [
  "id",
  "startedAt",
  "elapsedLabel",
  "factsLocked",
  "angleChosen",
  "messages",
  "reporterTyping",
  "draft",
  "openers",
  "exhausted",
  "type",
  "tone",
  "testMode",
  "facts",
  "proposedFacts",
] as const;
