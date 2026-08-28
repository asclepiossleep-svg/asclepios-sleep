# Deployment — GitHub + Vercel + Supabase

This replaces the earlier generic Postgres/Docker Compose plan with the
stack the Master Kick-off V1 doc names directly (§17). It's written so
Edmund can follow §1 himself; everything after that is done by whoever is
driving Claude Code.

## §1 — The one thing only Edmund can do

1. Go to github.com and sign in (or create a free account if you don't have
   one — "Sign up" in the top right, an email + password is all it needs).
2. Click the **+** icon top-right, then **New repository**.
3. Name it `asclepios-sleep`. Leave everything else as default. Click
   **Create repository**.
4. Copy the repository's URL (the green **Code** button shows it) and send
   it back. That's it — stop here.

## §2 — What happens next (no owner action required)

Claude Code pushes the reconciled codebase to that repository.

## §3 — Connect Vercel (one click from Edmund, when asked)

1. Go to vercel.com, click **Continue with GitHub**, authorize it.
2. Click **Add New -> Project**, select the `asclepios-sleep` repository.
3. Vercel will detect two things to deploy — the API (`apps/api`, via its
   `vercel.json`) and the web app (`apps/web`, a standard Vite build).
   Two Vercel projects, both pointed at the same GitHub repo's different
   subfolders (Vercel calls this the project's "Root Directory" setting)
   is the simplest setup — Claude Code will specify exactly what to type
   into each field when this step comes up.
4. Click **Deploy**. Vercel gives a `*.vercel.app` URL immediately, and a
   new one on every future push automatically — that URL is the staging
   URL used in every handoff from here on.

## §4 — Connect Supabase (one paste from Edmund, when asked)

1. Go to supabase.com, sign in with GitHub, click **New project**.
2. Pick a name and a database password (Supabase generates one if you
   leave it blank — either is fine, it's only used internally).
3. Once the project finishes setting up, go to **Project Settings ->
   Database -> Connection string**. There are two values needed —
   Claude Code will say exactly which two to copy and where in Vercel's
   **Environment Variables** screen to paste each one
   (`DATABASE_URL` and `DIRECT_URL`).

## Why this stack

- No server to patch, monitor, or restart — Vercel and Supabase both run
  themselves.
- A `git push` is the entire deploy process once §1-§4 are done once.
- Preview URLs happen automatically for every change, so testing before
  something goes live needs no extra setup.
- Local development (`npm run dev`) stays 100% independent of all of this —
  it uses a local SQLite file and needs none of the above accounts, so
  building doesn't stop while any of this is being set up.

## How the codebase supports this

- `apps/api/vercel.json` + `apps/api/api/index.ts` — the Express API runs
  as a single Vercel serverless function; `apps/api/src/app.ts` is the one
  place the app is actually assembled, imported by both the serverless
  entry point and by local dev (`src/index.ts`).
- `apps/api/prisma/schema.staging.prisma` — the Postgres/Supabase variant
  of the schema. `apps/api/prisma/schema.prisma` (SQLite) stays the local
  dev default and is never edited to point at Postgres — see the comment
  at the top of that file. `npm run check:schema-parity` (in `apps/api`)
  fails the build if the two ever drift apart in their actual models.
- `apps/api/package.json`'s `vercel-build` script runs the parity check,
  generates the Prisma client against the staging schema, applies
  migrations, then compiles — all automatically on every push.

## Known limitation carried over from local dev

This sandbox's network cannot reach `binaries.prisma.sh`, so
`prisma generate`/`migrate` cannot run *in this Claude Code session*
against either schema file — confirmed again on this pass, unchanged from
the original Build Brief. Vercel's own build environment has normal
internet access, so `vercel-build` is expected to run cleanly there; this
has not been verified end-to-end yet because there is no live Vercel
project to test against until §1-§4 above happen.
