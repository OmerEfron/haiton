const API = "https://iton-api.fly.dev";
const REPORTER = "https://iton-reporter.fly.dev";

const API_EXACT = new Set([
  "/health",
  "/stories",
  "/flashes",
  "/connections",
  "/invitations",
  "/readers",
  "/profile",
]);

const API_PREFIXES = [
  "/auth/",
  "/editions/",
  "/karteset/",
  "/stories/",
  "/connections/",
  "/invitations/",
  "/profile/",
];

function originFor(pathname: string): string | null {
  if (pathname === "/interviews" || pathname.startsWith("/interviews/")) {
    return REPORTER;
  }
  if (API_EXACT.has(pathname) || API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return API;
  }
  return null;
}

export default {
  async fetch(request: Request, env: { ASSETS: { fetch: (req: Request) => Promise<Response> } }) {
    const url = new URL(request.url);
    const origin = originFor(url.pathname);
    if (!origin) return env.ASSETS.fetch(request);

    // SPA refresh of /profile must stay HTML, not the JSON API.
    if (
      url.pathname === "/profile" &&
      request.headers.get("Sec-Fetch-Dest") === "document"
    ) {
      return env.ASSETS.fetch(request);
    }

    const dest = new URL(url.pathname + url.search, origin);
    return fetch(new Request(dest, request));
  },
};
