# Owner Runbook — Asclepios Sleep

This file exists so nobody working on this project (including a future
Claude session) forgets one rule: **Edmund is the product decision-maker,
not the DevOps operator.** He should never be asked to inspect source code,
follow a multi-step technical checklist, or make a broad technical
preference call that the specification already answers.

This is the operating protocol from the Master Kick-off V1 doc (§23-25),
written down so it survives past this one conversation.

## The rule

> If there are 5 technical steps: perform whatever you can yourself, then
> ask the owner for the minimum one unavoidable action.

Good ask: *"Please sign in to GitHub and approve access. Tell me when you
see 'Authorized'."*

Bad ask: *"Create a repo, configure remote origin, create env vars, install
CLI, configure OAuth callback and set the deployment token."*

## Every staging handoff includes

- A staging URL
- The build/version number
- Which demo accounts are available
- What changed since the last handoff
- What is ready to test
- Known limitations

No source code inspection required. Everything should be testable from a
phone browser.

## The one action queue for this project (live list)

Update this list as each action is completed — don't re-ask for something
already done.

1. **Not yet done:** Create a free GitHub account (skip if you already have
   one) and one new empty repository. Exact steps are in
   `DEPLOYMENT.md` §1. This is the only step nobody but Edmund can do —
   everything after it (Vercel project, Supabase database, environment
   variables, first deploy) is configured by Claude Code once the repo
   exists.
2. Not yet requested — comes after #1: authorize Vercel against that GitHub
   repo (one click).
3. Not yet requested — comes after #2: paste one connection string from
   Supabase into Vercel's environment variables screen.

Each of these gets asked for on its own, only once the previous one is
done — never all three at once.

## Documents this project still needs from Edmund

- `Asclepios_Sleep_Master_System_Specification_V2.pdf` — referenced by the
  Master Kick-off doc as the "Primary master" specification, but has not
  actually been supplied. Not blocking — the 7 original handoff docs +
  the Master Kick-off doc + the real product catalog are being treated as
  authoritative in the meantime.
- `04_SaaS_Backend_Admin_Data_Architecture.pdf` — referenced in the
  original handoff pack's index but never supplied either.

Neither gap stops implementation. Flagging here so the next person who
opens this project sees it immediately instead of re-discovering it.
