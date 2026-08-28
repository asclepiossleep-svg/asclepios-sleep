# Asclepios Sleep — V1 Engineering Scaffold

Handoff target: **Claude Code / Manus**. Source docs: `00 Handoff Index`, `01 Product & UX Master Brief`, `02 SaaS Decision, Scoring & Q&A Engine`, `03 Monitoring, Review & Adaptive Strategy`, `05 Frontend UX, Media & Localization`, `06 Claude Code Implementation, QA & Staging`, `Supplement 07 Account, Demo, QR & Sleep Session`, and — as of 27 Aug 2026, superseding any conflict in the above — `Asclepios_Sleep_ClaudeCode_Master_Kickoff_V1.pdf`. (Doc `04 Backend/Admin/Data Architecture` and the Kick-off doc's own referenced "Primary master," `Asclepios_Sleep_Master_System_Specification_V2.pdf`, were never supplied — see `OWNER_RUNBOOK.md` "Documents this project still needs.")

## Direction change — 27 Aug 2026 Master Kick-off

The Master Kick-off doc validated most of what was already built (same
vertical slice, same 11 action codes, same sleep session model, same 9 demo
accounts) and changed three things, now reflected in this repo:

1. **Infra: Vercel + Supabase, not generic Postgres/Docker Compose.** See
   `DEPLOYMENT.md`. `docker-compose.yml`/`scripts/backup.sh`/`restore.sh`
   are kept for anyone who wants to self-host Postgres instead, but are no
   longer the recommended path.
2. **Owner-communication protocol, written down.** See `OWNER_RUNBOOK.md`
   — one unavoidable action at a time, plain language, no code review
   asked of Edmund.
3. **Schema additions:** `Product.market` / `Product.lifecycleState`,
   `ContentItem.layer` (PUBLIC / PRODUCT_LOCKED / PAID_PROGRAMME), and 3
   more `Wallpaper` categories (SUNRISE, MIST_MOUNTAINS, STARRY_SKY) — all
   centralized in `packages/shared` per the existing "never hard-code
   twice" rule.

Nothing about the product/engine/session model itself changed — this was a
scope/process correction, not a rebuild.

Design baseline locked across every doc: **SaaS-first, AI-light**. The whole vertical slice below runs on buttons, rules and versioned config with **zero AI calls**. `ai_gateway` and `product_activation_qr` are DB-backed feature flags, both **OFF** by default.

**Product line:** the seed data uses the real Phase 1 catalog (阿斯康睡眠管理catalog.pdf, supplied 27 Aug 2026, confirmed by Edmund as authoritative over the earlier Drive brand memory) — three SKUs: **SLEEPTAPE™ Nasal Strips** (worn nightly, not a mouth tape despite the name), **DAY MODE™** (daytime gut/mood drink powder, taken before/with a main meal — not tracked by the nightly `ProductUsageLog`/adherence model as it stands), and **REST & SLEEP MODE™** (night-time magnesium/relaxation drink powder, taken 30-60 min before bed). Full ingredient panels are in the attached Claude Project's `asclepios-sleep-product-catalog-digest.md`. An earlier draft of this scaffold used a 4-SKU line from the brand's Drive memory (SLEEPTAPE™ as a mouth tape + AIRFLOW™ + a magnesium spray + AIRMASK™) — that's retired; if you see those names anywhere outside this file's git history, they're stale. **Regulatory note for Manus/Admin content:** the brand memory doc locks a Part A/B content rule that still applies — never claim to "treat/solve/cure" sleep apnoea (OSA) or use the clinical term for dyspnea in any content tier, including internal drafts; never depict an AI-generated or role-played medical professional endorsing a product. Whoever writes copy into `Product.description` / `ContentItem` via Admin needs to know this — it isn't enforced by the code, only by process. **Build-sequence gap this surfaced:** DAY MODE™ is a daytime, before-meal product with no home in the current Tonight-only routine model — the app doesn't have a "daytime routine" concept yet. Flagged as a new item, not built in this scaffold.

## What's actually built here

This is not a mockup — it's a real, runnable monorepo implementing Doc 00's priority order (§2): config/data model first, a 0-AI vertical slice second, admin CRUD third.

```
apps/api      TypeScript + Express + Prisma. All 14 service boundaries from Doc 06 §2
              exist as folders/modules. The Decision Engine (scoring, adherence,
              response, strategy, state) is pure/deterministic — see "Verified" below.
apps/web      TypeScript + React + Vite, installable PWA. Screens: Login (Email OTP +
              staging Demo Selector), Assessment, Tonight, Sleep Player, Morning
              Check-in, 7-Day Review, Admin.
packages/shared  Single source of truth for every enum/vocabulary term across all
              7 docs (tags, action codes, severity buckets, sleep audio presets,
              wake styles, feature flags, the 9 demo accounts). Both apps import
              from here — nothing is redefined or hard-coded per-app.
scripts/      Postgres backup.sh / restore.sh for staging & prod (self-host path).
docker-compose.yml   Local Postgres for the self-host alternative to Vercel+Supabase.
DEPLOYMENT.md   GitHub + Vercel + Supabase deployment plan (preferred path).
OWNER_RUNBOOK.md   Owner-communication protocol + the live "one action" queue.
```

### Vertical slice implemented end-to-end (Doc 00 §2 priority #4)

`Auth (Email OTP or Demo Login) → Initial Assessment → Tonight → Sleep Player → Wake → Morning Check-in → 7-Day Review`, plus a basic Admin surface (products + feature flags) proving config lives in the DB, not the UI (Doc 01 §5's one non-negotiable rule).

## Architecture rules this scaffold follows (do not relax these)

- **Nothing customer-facing is hard-coded.** Products, questions, answers, tag effects, rules, audio, wallpaper, and feature flags are all DB rows (`Product`, `Question`, `AnswerOption`, `DecisionRule`, `AudioTrack`, `Wallpaper`, `FeatureFlag`). The `Admin` CRUD router (`apps/api/src/routes/admin.ts`) is generic over entity name for exactly this reason — adding a new admin-editable table is one `crud(...)` line, not a new deploy path.
- **Entitlement resolution is centralized** — `apps/api/src/domain/entitlement.ts` is the only place that decides "can this user use X." Order fulfilment, Admin grants, Demo seeding, and (later) QR activation all call the same `grantEntitlement()`.
- **The Decision Engine is pure and replayable** (Doc 06 §3: "相同 state+version → 相同 decision"). `apps/api/src/domain/decision/{scoringEngine,adherenceEngine,responseEngine,strategyEngine}.ts` take explicit input, return explicit output, touch no database. The orchestrator (`decision/index.ts`) is the only layer that reads/writes Prisma.
- **Safety always outranks product/AI recommendation** (Doc 03 §10) — `strategyEngine.ts`'s first branch is the safety check; nothing above it can override an `ESCALATE`.
- **Account ≠ Membership ≠ Product Ownership ≠ Entitlement** (Supplement 07 §2) — four separate Prisma models, never collapsed.
- **QR/Activation stays wired but OFF** (Supplement 07 §7) — `ActivationCode`/`QrBatch` tables and the `activation` service boundary exist; the frontend simply never renders QR entry points while `product_activation_qr = false`. Turning it on later is a flag flip + UI addition, not a rewrite.
- **Audit is append-only** — `AuditLog` rows are only ever created, never updated/deleted; the generic Admin CRUD router writes one on every mutation.

## Getting started (dev, SQLite — zero external dependencies)

```bash
npm install
cp .env.example apps/api/.env
npm run db:migrate --workspace=apps/api    # creates apps/api/prisma/dev.db
npm run db:seed --workspace=apps/api       # seeds base config + all 9 demo accounts
npm run dev:api                            # http://localhost:4000
npm run dev:web                            # http://localhost:5173 (proxies /api -> :4000)
```

Log in via the staging Demo Selector on the login screen (any of the 9 Supplement 07 §5 accounts), or via Email OTP — the `/auth/otp/request` response includes `devCode` outside `NODE_ENV=production` so you can test the flow without a real mail provider wired up yet.

### Deploying to staging/production

Preferred path is **Vercel + Supabase** — see `DEPLOYMENT.md` for the full
walkthrough (including the one thing only Edmund can click). In short:
`apps/api/prisma/schema.staging.prisma` is the Postgres/Supabase-ready
schema — `apps/api/prisma/schema.prisma` (SQLite) is never edited to point
at Postgres; the two are kept in sync by `npm run check:schema-parity`
(from `apps/api`), which the `vercel-build` script runs automatically.

Self-hosting Postgres instead is still possible: `docker compose up -d`,
point `DATABASE_URL` at it, then run Prisma commands with
`--schema=prisma/schema.staging.prisma`.

## ⚠️ One thing this sandbox could not verify — please run it in yours

`npx prisma generate` / `prisma migrate dev` need to download the Prisma schema-engine/query-engine binaries from `binaries.prisma.sh`. **The network sandbox this scaffold was built in blocks that host (403 Forbidden)** — every other package installed fine from the npm registry. This is an environment restriction, not a code defect.

What *was* verified in this sandbox (all green):
- `npm install` across the whole workspace — clean.
- `tsc --noEmit` on `packages/shared` and `apps/web` — clean, zero errors (re-confirmed 27 Aug after the schema/shared additions below).
- `vite build` for the PWA, including service-worker generation — succeeds.
- `bash apps/api/scripts/check-schema-parity.sh` — `schema.prisma` and `schema.staging.prisma` match outside their header/datasource block.
- A standalone runtime test of the four core Decision Engine functions (`apps/api/src/domain/decision/__smoketest.ts`, run via `npx tsx`) — **all 10 assertions pass**, including the Doc 03 §3 worked examples (2/7 nights → LOW, 7/7 with no improvement → HIGH_NO_IMPROVEMENT), the safety-always-wins rule (Doc 03 §10), and "owned + low adherence → REMIND, never a new sell" (Doc 03 §6).

Note: `apps/api`'s own `tsc --noEmit` surfaces a handful of pre-existing
strict-mode looseness (a few implicit-`any` callback params in
`decision/index.ts`/`questionEngine.ts`/`entitlement.ts`/`tonight.ts`, and
one `TagEffect` shape mismatch) — none in files touched by this pass
(`app.ts`, `api/index.ts`, the schema, `demoSeed.ts`, `packages/shared`),
and none are new. Worth a cleanup pass but not blocking.

**First thing to do in Manus:** run `npm run db:migrate --workspace=apps/api && npm run db:seed --workspace=apps/api`, confirm it succeeds, then smoke-test the three staging personas Doc 06 §7 calls out as the minimum first delivery: **Demo New User, Demo Poor Response, Demo Admin**.

## What's next — Doc 06 §4 Build Sequence, mapped to this repo

1. ✅ Foundation — repo, PWA shell, auth, DB, RBAC (role field), audit, feature flags.
2. ✅ Admin Config First — basic CRUD exists for Product/Question/AnswerOption/DecisionRule/AudioTrack/Wallpaper/ContentItem/Programme/RoutineStepDef. **Not yet done:** a real admin UI beyond the Products tab — wire the same pattern into `Admin.tsx` for the rest.
3. ⬜ Commerce & Activation — no payment provider is integrated yet (Doc 06 §1 recommends a mature subscriptions/webhooks provider + separate bank-transfer workflow). `ActivationCode`/`QrBatch` tables exist but the flag stays OFF per Supplement 07.
4. ✅ Core Daily UX vertical slice — Onboarding, Assessment, Tonight, Sleep Player, Morning Check-in all working end-to-end against real DB state.
5. ⬜ Media — `AudioTrack`/`Wallpaper` are DB rows with a `url` field but nothing is actually hosted on CDN yet; wire object storage + signed URLs before using real media.
6. 🟡 Decision & Review — 7-Day Review is fully implemented (`run7DayReview`); 28-Day Reassessment exists (`run28DayReassessment`) but its "pattern changed" detection is currently a stub input (`patternChangedSinceLastAssessment: false`) — implement real trend comparison against `CoreProfileSnapshot`.
7. ⬜ AI Gateway — intentionally not built. `ai_gateway` flag is OFF; `routeIntent()` already has the button-vs-free-text fork point ready for when you add it (Doc 02 §9: free text → tags only, never controlling Product/Safety/Strategy directly).
8. ⬜ Analytics/Ops — `AnalyticsEvent` table exists; no events are actually emitted yet from the routes. Add `prisma.analyticsEvent.create(...)` calls at the funnel points Doc 06 §8 lists.

## Automated tests (Doc 06 §5) — what exists vs. what to add

- Unit: `decision/__smoketest.ts` covers the engines directly; convert to Vitest/Jest and expand coverage (entitlement resolution, timezone handling, product-combination logic) once `prisma generate` runs in your environment.
- Everything else in Doc 06 §5's matrix (API Contract, Integration, E2E Mobile, Visual Regression, Security, AI Eval, Load, PWA, Real Device) is not yet built — this scaffold is the foundation layer those tests run against.

## Staging review workflow (Doc 06 §7)

Seed accounts are ready (`npm run db:seed`). Minimum first staging delivery per Doc 06 §7 / Supplement 07 §23: deploy behind a password-protected URL, confirm **Demo New User → Initial Assessment → Tonight → Sleep Player → Morning Check-in → 7-Day Review** works, and that an Admin account can edit a product/question without a redeploy. Expand from there — don't wait for full feature completeness before the first staging review.

## Backup & restore

```bash
DATABASE_URL=postgresql://... ./scripts/backup.sh              # -> backups/asclepios-<timestamp>.sql.gz
DATABASE_URL=postgresql://... ./scripts/restore.sh backups/asclepios-<timestamp>.sql.gz
```

`backup.sh` keeps the last 30 dumps and prunes older ones. Wire it to a nightly scheduled job once staging is live; SQLite dev doesn't need this (just `cp apps/api/prisma/dev.db` if you want a local snapshot).

## Definition of Done (Doc 06 §8) — tracked against this repo

| Item | Status |
|---|---|
| Product/question/rule/content/locale/entitlement changes need no deploy | ✅ all DB-backed |
| AI provider can be swapped/off without breaking main flow | ✅ `ai_gateway` flag OFF, no AI in the main flow at all yet |
| Morning Check-in ≤3 primary actions | ✅ rating/waking/energy only; Add Details is opt-in |
| Start Sleep flow never shows unrelated product steps | ✅ Tonight caps at 3 steps, prioritised |
| Decision history retains version | ✅ `decisionVersion` on TagScore/ReviewSnapshot/CoreProfileSnapshot |
| Media delivered via CDN | ⬜ not wired — see Build Sequence item 5 |
| QR/Payment grants entitlement with audit | 🟡 `grantEntitlement()` always audits; QR itself is flagged off, payment not integrated |
| Multi-language layout doesn't break | 🟡 `en` + `zh-HK` wired via `packages/shared`-style i18n resource files; add `zh-TW`/`zh-CN` the same way |
| Safety rules outrank product recommendation | ✅ `strategyEngine.ts` first branch |
| Admin can add products/questions/media/course/promotion unaided | 🟡 Products done in the UI; Question/Rule/Content CRUD exists on the API, needs the equivalent UI tabs |

---

*Generated as part of an implementation handoff digest of docs 00, 01, 02, 03, 05, 06 and Supplement 07 — 27 Aug 2026.*
