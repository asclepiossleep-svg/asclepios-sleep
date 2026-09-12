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

1. ~~Create a free GitHub account and one new empty repository.~~ **Done** —
   repo exists, Vercel and Supabase are both connected, four Vercel
   projects are live (`asclepios-sleep-web`, `asclepios-sleep-api`,
   `asclepios-health-web`, `asclepios-health`).
2. ~~Authorize Vercel against the GitHub repo.~~ **Done.**
3. ~~Paste one Supabase connection string into Vercel's environment
   variables.~~ **Done.**
4. **Not yet done — current single blocking action:** attach the 4-page
   Asclepios product catalog (the one referenced in the issue #61
   correction, showing SLEEPTAPE™ Nasal Strips / DAY MODE™ / REST & SLEEP
   MODE™ packaging) directly to issue #61 as a GitHub file attachment, or
   commit it into the repo at `docs/product/catalog/`. This is the only
   thing blocking real product imagery on the Health homepage's Products
   card — three independent Rex sessions (PR #63) have each done a full
   repo/git-history/issue/PR search and confirmed the file is not
   retrievable from anywhere Claude Code has access to. No further
   automated diagnosis of this will find a different answer; only the
   owner can supply the file. (Alternative that also unblocks it: a
   read-only Shopify Admin API token with `read_products` scope, added as
   a GitHub Actions secret, if the real photos already exist on the
   Shopify draft listings.)

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
