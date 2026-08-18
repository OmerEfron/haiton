/** Frozen HTTP contract from docs/features/core-api/PLAN.md (W0). */

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

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
  { method: "GET", path: "/stories/:id", handler: "getStory" },
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
  {
    method: "GET",
    path: "/connections/suggested",
    handler: "listSuggestedConnections",
  },
  { method: "GET", path: "/invitations", handler: "listInvitations" },
  { method: "POST", path: "/invitations", handler: "sendInvitation" },
  {
    method: "POST",
    path: "/invitations/:id/respond",
    handler: "respondToInvitation",
    notes: "body: { accept }",
  },
  { method: "DELETE", path: "/invitations/:id", handler: "cancelInvitation" },
  { method: "PATCH", path: "/connections/:id", handler: "updateConnection" },
  { method: "DELETE", path: "/connections/:id", handler: "removeConnection" },
  {
    method: "GET",
    path: "/readers",
    handler: "searchReaders",
    notes: "query: q",
  },
] as const;

/** Stable key for deduping routes in tests. */
export function routeKey(route: Pick<RouteContract, "method" | "path">): string {
  return `${route.method} ${route.path}`;
}
