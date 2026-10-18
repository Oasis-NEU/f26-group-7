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

- `/` - weekly event discovery and niche filtering
- `/messages` - placeholder for public alerts
- `/profile` - placeholder for profile preferences

## Supabase

The current database schema is in `supabase/table.sql`. It defines the readable `events` table and enables realtime event updates. Public event reads are handled in `src/lib/events.js`; the browser does not perform privileged writes.

## Git workflow

The shared integration branch is `origin/main`. Work on the provided `landon` branch or another existing feature branch. If a new branch is necessary, use a descriptive name without a person's name, such as `phase-1-foundation` or `interactive-map`.

Before pushing, verify the branch and worktree:

```bash
git status
git branch --show-current
git branch -vv
```

Push feature work with `git push -u origin HEAD` and open a pull request into `main`. Never stage or push `.env`, Supabase keys, or other local secrets.
