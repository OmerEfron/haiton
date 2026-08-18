# העיתון · Haiton — UI

Front end for Haiton, a Hebrew personal newspaper: an AI reporter interviews you about
your week and writes news stories about your life, published into your daily edition.

Built from the **"Haiton app UI mockups"** Claude Design project (13 screens, desktop 1280
and mobile 390). React + Vite, TypeScript, static build, RTL throughout.

Data comes from the `api/` and `ai-reporter/` packages over HTTP (`VITE_API_URL`,
`VITE_REPORTER_URL`). A seeded login (`omer@example.com` / `iton-dev`) starts with an
empty edition.

This is the `frontend/` package of the repo:

```
iton/
  frontend/     this app
  api/          core service (auth, users, CRUD, social graph)
  ai-reporter/  reporter-agent service (interviewing, story writing)
```

## Running it

Needs **Node ≥ 20.19** (`.nvmrc` pins 24; the tooling will not run on Node 18). The API
must be running as well (see `api/`).

```bash
nvm use && npm install && npm run dev
```

```bash
npm run build && npm run preview
```

`npm run build` emits a fully static `dist/`. Because routing uses clean URLs, the host
needs an SPA fallback — `public/_redirects` (Netlify) and `vercel.json` are included; for
nginx it is `try_files $uri /index.html`.

## Screens

| Route | Mockup | |
|---|---|---|
| `/` | 1a · 1b · 1c | Front page. Falls back to the "first edition" state when the edition is empty. |
| `/story/:storyId` | 1d | Full story with edition tag and section follow-ons. |
| `/interview` | 1e · 1f | The interview room: chat plus the live draft. 1f is the first-interview state. |
| `/karteset` | 1h · 1i | The reporter's standing background file. Add / edit / remove facts. |
| `/circle` | 2a · 2b · 2c | מעגל הקרובים — connections, invitations, and the add-connection dialog. |
| `/profile` | 1g, refined by 2d | כתב הבית — stats, sections, edition settings, circle card. |
| `/briefs` | — | Extrapolated: the mobile tab bars link to מבזקים but no mockup exists. |
| `/login` | 1i (lower) | Sign in / sign up. |

The masthead follows **2d**, which the design doc itself flags as the intended refinement
of the nav in 1a/1g/1h.

## What is interactive

Server state is TanStack Query over the functions in `src/api/`. Query keys live in
`src/lib/queryKeys.ts`.

- **Interview → publish.** The reporter service runs the interview and writes the draft.
  Publishing posts it to the core API as both a lead story and a flash.
- **Karteset.** Add, inline-edit and remove facts, filtered by category.
- **Circle.** Approve or reject invitations (the masthead badge follows), search readers,
  send an invitation, remove a connection.
- **Profile.** Edition-tag and reminder settings; the tag setting changes what the front
  page and story pages render.

## The API seam

```
src/api/
  types.ts       the wire shapes both services return
  client.ts      fetch wrapper for the core API
  core/          → CORE API:     auth, stories, karteset, connections, profile
  reporter/      → REPORTER API: the interviewing / story-writing agent
```

Every function there is `async (input) => Promise<T>` over HTTP. Nothing under
`src/components` or `src/routes` talks to a backend directly.

`InterviewSession` carries `reporterTyping` and `draft.pendingParagraph`, so the UI
can render a story that is only half-written.

## Layout

Hebrew copy lives in `src/copy/`, not inline in components, so it can be swapped for i18n
later. Design tokens (the paper palette, type scale, the `hai-blink` / `hai-dot` /
`hai-tick` keyframes) are in `src/styles/`, with one CSS module per component. Layout uses
logical properties throughout; the responsive breakpoint is 900px.
