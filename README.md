# Espial

Espial is a React app for finding small events around Fenway and downtown Boston. The Home page searches events in Supabase (words, dates, niches, walking distance and price), groups them into a timetable, pins them on a map with the T lines, and refreshes when event rows change.

## Local setup

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Create a local `.env` file with the Supabase values used by the app:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.env` files are ignored by Git and must never be committed or pushed. Restart the Vite server after changing environment variables.

## Available commands

```bash
npm run dev       # Start the local Vite server
npm run build     # Create a production build
npm run lint      # Run ESLint
npm run test      # Run Vitest once
npm run test:watch
npm run check     # Run tests, lint, and build
npm run fetch-lines  # Re-download the T line shapes (only if the MBTA changes a route)
```

## Current routes

Anyone can see:

- `/` - event discovery: search, When, walking distance, price and niches, all kept in the address (`/?q=vinyl&when=weekend&niche=Records,Film&walk=10&near=Symphony&price=free`) so a filtered view can be shared. Logged in, a "For you" row shows events in your niches, closest to your home stop first. A small map shows the same events, with a link to `/explore`.
- `/explore` - the full map: the same filters and address as `/`, with a map and a list that stay in step (pick a pin to mark its row, or "Show on map" to mark its pin). The walk filter is drawn as a circle.
- `/events/:id` - one event: details, directions, calendar, sharing, and Going / Interested / Save when logged in
- `/welcome`, `/login`, `/signup` - what Espial is, and email-and-password accounts
- `/styleguide` - every color, component and form control

Need an account (logged-out visitors are sent to `/login`, then back):

- `/onboarding` - name, username, niches, home stop and school; required once before anything else
- `/profile` - your profile and your upcoming Going, Interested and Saved events
- `/settings` - edit your profile, photo, preferences and privacy; log out

Placeholders, each built in a later roadmap step: `/u/:username` (public), and `/events/new`, `/messages`, `/friends`, `/notifications`, `/admin` (account needed).

Who's logged in comes from `useAuth()` in `src/lib/useAuth.js`; the route guards are in `src/components/Guards.jsx`. Data that changes (searches, an event, your RSVPs) loads through TanStack Query; the hooks are in `src/lib/useEventSearch.js`, `src/lib/useEvent.js` and `src/lib/useMyEvents.js`. The filters are read from and written to the address in `src/lib/filters.js`, and searches run in the database through `search_events()` (migration 0007).

The map is `src/components/EventMap.jsx` (MapLibre), loaded through `LazyEventMap.jsx` so the map library only downloads on pages with a map. What it draws is worked out in `src/lib/mapData.js`. The tests can't draw maps, so they replace `EventMap` with a stand-in.

Shared building blocks (buttons, form fields, avatars, dialogs, empty states) live in `src/components/ui/`. Colors are tokens in `src/index.css`; use the token names, never raw colors.

## Map data

- **Streets:** [OpenFreeMap](https://openfreemap.org/)'s Positron style, built from [OpenStreetMap](https://www.openstreetmap.org/copyright). Free and with no key; the map shows their credits in its corner.
- **T lines:** track shapes from the [MBTA's V3 API](https://www.mbta.com/developers/v3-api), saved in `src/data/t-lines.json` by `npm run fetch-lines` (`scripts/fetch-t-lines.js`). The site reads the saved file and never calls the MBTA. The map credits the MBTA, as its license asks.

## Supabase

The database's structure lives in `supabase/migrations/`, one numbered SQL file per change, and `supabase/seed.sql` adds sample events. Read [supabase/README.md](supabase/README.md) before changing the database. Public event reads are handled in `src/lib/events.js`; the browser does not perform privileged writes.

## Git workflow

The shared integration branch is `origin/main`. Make one short-lived branch per feature, starting from the latest `main`, and name it for what it holds, without a person's name or a step number, such as `accounts` or `interactive-map`:

```bash
git switch main
git pull
git switch -c interactive-map
```

Open a pull request into `main` when the feature is done, and delete the branch after it merges.

Before pushing, verify the branch and worktree:

```bash
git status
git branch --show-current
git branch -vv
```

Push feature work with `git push -u origin HEAD` and open a pull request into `main`. Never stage or push `.env`, Supabase keys, or other local secrets.
