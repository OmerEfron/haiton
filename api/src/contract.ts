/** Frozen HTTP contract from docs/features/core-api/PLAN.md (W0). */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RouteContract {
  method: HttpMethod;
  path: string;
  /** Handler name in frontend/src/api/core; omitted for api-only routes. */
  handler?: string;
  /** Request shape notes for W1 implementers. */
  notes?: string;
}

/** Cookie session name — httpOnly, set by auth router (W1). */
export const SESSION_COOKIE_NAME = "iton_session";

export const ERROR_UNAUTHORIZED = "יש להתחבר כדי להמשיך";
export const ERROR_DAILY_QUOTA = "הגעתם לשתי ידיעות להיום. מחר הכתב מחכה שוב.";
export const ERROR_RATE_LIMIT = "יותר מדי בקשות. נסו שוב בעוד רגע.";
export const ERROR_INTERNAL = "משהו השתבש בשולחן העורכים";
export const ERROR_INTERVIEW_NOT_FOUND = "ראיון לא נמצא בארכיון";
export const DAILY_INTERVIEW_LIMIT = process.env.DAILY_INTERVIEW_LIMIT ? parseInt(process.env.DAILY_INTERVIEW_LIMIT) : 2;
export const DAILY_STORY_LIMIT = process.env.DAILY_STORY_LIMIT ? parseInt(process.env.DAILY_STORY_LIMIT) : 2;

export const ROUTES: readonly RouteContract[] = [
  { method: "GET", path: "/health" },
  { method: "GET", path: "/auth/session", handler: "getSession" },
  {
    method: "POST",
    path: "/auth/sign-in",
    handler: "signIn",
    notes: "body: { email, password }",
  },
  {
    method: "POST",
    path: "/auth/sign-up",
    handler: "signUp",
    notes: "body: { name, email, password }",
  },
  { method: "POST", path: "/auth/sign-out", handler: "signOut" },
  { method: "GET", path: "/editions/current", handler: "getFrontPage" },
  {
    method: "GET",
    path: "/editions/:userId",
    handler: "getUserEdition",
    notes: "that user’s paper; 404 unless self or connected",
  },
  { method: "GET", path: "/stories/:id", handler: "getStory" },
  {
    method: "GET",
    path: "/stories/share/:token",
    handler: "getSharedStory",
    notes: "optional session; teaser unless author or connected",
  },
  {
    method: "GET",
    path: "/stories",
    handler: "listStories",
    notes: "query: section?",
  },
  {
    method: "GET",
    path: "/flashes",
    handler: "listFlashes",
    notes: "response: { flashes, dateShort }",
  },
  {
    method: "POST",
    path: "/stories",
    handler: "publishStory",
    notes: "body: Draft",
  },
  {
    method: "PATCH",
    path: "/stories/:id",
    handler: "updateStory",
    notes: "body: { headline?, standfirst?, body?: string[], hidden?: boolean }; owner only",
  },
  {
    method: "DELETE",
    path: "/stories/:id",
    handler: "removeStory",
    notes: "owner only; 204",
  },
  { method: "GET", path: "/profile", handler: "getProfile" },
  {
    method: "PATCH",
    path: "/profile/edition-settings",
    handler: "updateEditionSettings",
  },
  { method: "GET", path: "/karteset/facts", handler: "listFacts" },
  { method: "POST", path: "/karteset/facts", handler: "addFact" },
  { method: "PATCH", path: "/karteset/facts/:id", handler: "updateFact" },
  { method: "DELETE", path: "/karteset/facts/:id", handler: "removeFact" },
  { method: "GET", path: "/connections", handler: "listConnections" },
  { method: "GET", path: "/connections/summary", handler: "getCircleSummary" },
  { method: "GET", path: "/invitations", handler: "listInvitations" },
  {
    method: "GET",
    path: "/invitations/preview/:token",
    handler: "previewInvitation",
    notes: "public; inviter name + initial",
  },
  {
    method: "POST",
    path: "/invitations/join",
    handler: "joinInvitation",
    notes: "body: { token } — invite token or story share token",
  },
  {
    method: "POST",
    path: "/invitations/:id/respond",
    handler: "respondToInvitation",
    notes: "body: { accept }; invitee only; accept writes two connection rows",
  },
  { method: "PATCH", path: "/connections/:id", handler: "updateConnection" },
  { method: "DELETE", path: "/connections/:id", handler: "removeConnection" },
  { method: "GET", path: "/quota", handler: "getQuota" },
  { method: "GET", path: "/desk/interviews", handler: "listInterviews" },
  { method: "GET", path: "/desk/interviews/:id", handler: "getArchivedInterview" },
  {
    method: "PUT",
    path: "/desk/interviews/:id",
    notes: "reporter upsert; body: InterviewSession",
  },
] as const;

/** Stable key for deduping routes in tests. */
export function routeKey(route: Pick<RouteContract, "method" | "path">): string {
  return `${route.method} ${route.path}`;
}
