/* One place to look when the mock functions become real endpoints. */
export const qk = {
  session: ["session"] as const,
  frontPage: ["front-page"] as const,
  edition: (userId: string) => ["edition", userId] as const,
  story: (id: string) => ["story", id] as const,
  sharedStory: (token: string) => ["shared-story", token] as const,
  flashes: ["flashes"] as const,
  facts: ["facts"] as const,
  profile: ["profile"] as const,
  connections: ["connections"] as const,
  invitations: ["invitations"] as const,
  invitePreview: (token: string) => ["invite-preview", token] as const,
  interview: ["interview"] as const,
  quota: ["quota"] as const,
  deskInterviews: ["desk-interviews"] as const,
  deskInterview: (id: string) => ["desk-interview", id] as const,
};
