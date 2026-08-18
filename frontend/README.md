# העיתון · Haiton — UI

Front end for Haiton, a Hebrew personal newspaper: an AI reporter interviews you about
your week and writes news stories about your life, published into your daily edition.

Built from the **"Haiton app UI mockups"** Claude Design project (13 screens, desktop 1280
and mobile 390). React + Vite, TypeScript, static build, RTL throughout.

**All data is mocked.** There is no API here — see [The API seam](#the-api-seam).

This is the `frontend/` package of the repo:

```
iton/
  frontend/   this app
  api/        reserved — core service (auth, users, CRUD, social graph)
  reporter/   reserved — reporter-agent service (interviewing, story writing)
```

## Running it

Needs **Node ≥ 20.19** (`.nvmrc` pins 24; the tooling will not run on Node 18).

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

State lives in memory and resets on reload — deliberately, so there is no persistence
layer to unpick when the real services arrive.

- **Interview → publish.** Sending a message advances a scripted reporter turn and fills in
  another part of the draft; "נסחו טיוטה" jumps to the finished story. Publishing writes it
  to the front page as both a lead story and a flash, and bumps the edition number.
- **Karteset.** Add, inline-edit and remove facts, filtered by category.
- **Circle.** Approve or reject invitations (the masthead badge follows), search readers,
  send an invitation, remove a connection.
- **Profile.** Edition-tag and reminder settings; the tag setting changes what the front
  page and story pages render.

To see an empty state, clear the matching array in `src/mocks/fixtures/`.

## The API seam

Two services are planned — the `api/` and `reporter/` folders alongside this one — and the
code here is already split along that line:

```
src/api/
  types.ts       the wire shapes both services will return
  client.ts      delay/clone helpers — where the HTTP client will be constructed
  core/          → CORE API:     auth, stories, karteset, connections, profile
  reporter/      → REPORTER API: the interviewing / story-writing agent
```

Every function there is `async (input) => Promise<T>`, reads and writes the in-memory store
in `src/mocks/db.ts`, and awaits an artificial delay so loading states are real. **To go
live, replace each function body with a call to the real endpoint. Nothing under
`src/components` or `src/routes` changes.**

Two details that already anticipate the real thing:

- Reads return `clone(...)`, exactly as an HTTP response would hand back fresh JSON.
- `InterviewSession` carries `reporterTyping` and `draft.pendingParagraph`, so the UI
  already renders a story that is only half-written — the shape a streaming agent needs.

Server state is TanStack Query over those functions; query keys live in
`src/lib/queryKeys.ts`. There is no `fetch`, base URL or endpoint string anywhere in `src/`.

## Layout

Hebrew copy lives in `src/copy/`, not inline in components, so it can be swapped for i18n
later. Design tokens (the paper palette, type scale, the `hai-blink` / `hai-dot` /
`hai-tick` keyframes) are in `src/styles/`, with one CSS module per component. Layout uses
logical properties throughout; the responsive breakpoint is 900px.
