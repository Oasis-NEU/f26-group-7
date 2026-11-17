# Espial

Espial is a React app for finding small events around Fenway and downtown Boston. The Home page loads events from Supabase, groups them into a weekly timetable, filters by niche, shows T-line information, and refreshes when event rows change.

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
```

## Current routes

Anyone can see:

- `/` - weekly event discovery and niche filtering
- `/events/:id` - one event: details, directions, calendar, sharing, and Going / Interested / Save when logged in
- `/welcome`, `/login`, `/signup` - what Espial is, and email-and-password accounts
- `/styleguide` - every color, component and form control

Need an account (logged-out visitors are sent to `/login`, then back):

- `/onboarding` - name, username, niches, home stop and school; required once before anything else
- `/profile` - your profile and your upcoming Going, Interested and Saved events
- `/settings` - edit your profile, photo, preferences and privacy; log out

Placeholders, each built in a later roadmap step: `/explore`, `/u/:username` (public), and `/events/new`, `/messages`, `/friends`, `/notifications`, `/admin` (account needed).

Who's logged in comes from `useAuth()` in `src/lib/useAuth.js`; the route guards are in `src/components/Guards.jsx`. Data that changes (an event, your RSVPs) loads through TanStack Query; the hooks are in `src/lib/useEvent.js` and `src/lib/useMyEvents.js`.

Shared building blocks (buttons, form fields, avatars, dialogs, empty states) live in `src/components/ui/`. Colors are tokens in `src/index.css`; use the token names, never raw colors.

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
