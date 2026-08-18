/* One place to look when the mock functions become real endpoints. */
export const qk = {
  session: ["session"] as const,
  frontPage: ["front-page"] as const,
  story: (id: string) => ["story", id] as const,
  flashes: ["flashes"] as const,
  facts: ["facts"] as const,
  profile: ["profile"] as const,
  connections: ["connections"] as const,
  invitations: ["invitations"] as const,
  circleSummary: ["circle-summary"] as const,
  suggestedConnections: ["suggested-connections"] as const,
  readerSearch: (q: string) => ["reader-search", q] as const,
  interview: ["interview"] as const,
  interviewPeek: ["interview", "peek"] as const,
};
