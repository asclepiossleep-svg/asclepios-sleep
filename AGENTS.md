# Asclepios Sleep — Product & Operating Context

Canonical operating context for **anyone working on this repository** — human
contributors and AI coding agents alike. `CLAUDE.md` (Claude Code) and
`GEMINI.md` (Gemini CLI) carry only tool-specific notes and defer here for
everything below.

Read this file, then the canonical specifications below, then
`OWNER_RUNBOOK.md`, `DEPLOYMENT.md`, and `README.md` before making
changes. Where this file and older handoff docs disagree on process, this
file wins; where they disagree on product facts, the master
specifications, the real product catalogue, and the Master Kick-off V1 doc
win (see `README.md`).

---

## 0. Canonical specifications

These are the approved, version-controlled master specs. This file
summarises the parts that bear on day-to-day engineering; **do not
duplicate them — link to the relevant section.** If code and a master spec
disagree, the spec is the intent and the gap is a bug or an unbuilt
feature.

| Spec | Scope |
|---|---|
| [`docs/company/AI_OS_MASTER.md`](./docs/company/AI_OS_MASTER.md) | RockPillar AI Operating System — departments, agent governance, PMO/orchestrator model, maturity & evidence standard, GitHub control structure, non-negotiable controls |
| [`docs/product/ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md`](./docs/product/ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md) | Dynamic assessment, the layered user model, tag/scenario vocabulary, decision-engine strategies, safety/screening (not diagnosis), the research-evidence framework and V1 anchors, programme logic, data-efficiency principles |
| [`docs/growth/GROWTH_MARKETING_MASTER.md`](./docs/growth/GROWTH_MARKETING_MASTER.md) | Content object model, research-to-marketing claim rules, brand messaging, Sleep-app vs Asclepios Health commerce split, funnel & measurement, referral/affiliate architecture |
| [`docs/ai/AI_COLLABORATION.md`](./docs/ai/AI_COLLABORATION.md) | Agent roles, `[AI-STATUS]` markers, the three CI workflows, usage-limit recovery |

---

## 1. What Asclepios Sleep is

An **integrated sleep company**, delivered as one customer journey that
combines four things and keeps them together:

1. **Physical sleep products** — the Phase 1 catalogue (see below).
2. **Education / content** — layered articles and guidance (`ContentItem`,
   layers `PUBLIC` / `PRODUCT_LOCKED` / `PAID_PROGRAMME`).
3. **The app** — a mobile-first installable PWA: assessment, a nightly
   routine ("Tonight"), a sleep player, a morning check-in, periodic review.
4. **AI guidance** — a thin, optional layer, **off by default**.

Do **not** let the product drift into a pure content app or a pure
ecommerce storefront. The physical product, the education, the app, and the
guidance reinforce each other; that integration is the product.

Full product philosophy, the dynamic user model, and the intelligence
design are in
[`ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md`](./docs/product/ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md);
the company-level operating model is in
[`AI_OS_MASTER.md`](./docs/company/AI_OS_MASTER.md).

### Design baseline: SaaS-first, AI-light

The entire vertical slice runs on **buttons, deterministic rules, and
versioned config with zero AI calls**. `ai_gateway` and
`product_activation_qr` are **DB-backed feature flags, both OFF by
default**. Turning either on later is a flag flip plus UI, never a rewrite.

### Phase 1 catalogue (authoritative)

| SKU | What it is | When used | Tracked by nightly adherence? |
|---|---|---|---|
| **SLEEPTAPE™ Nasal Strips** | Nasal strip worn nightly (not a mouth tape, despite the name) | Every night | Yes |
| **REST & SLEEP MODE™** | Night-time magnesium / relaxation drink powder | 30–60 min before bed | Yes |
| **DAY MODE™** | Daytime gut / mood drink powder | Before or with a main meal | **No** — no "daytime routine" concept exists yet; flagged, not built |

An earlier 4-SKU line (SLEEPTAPE™ as a *mouth* tape, AIRFLOW™, a magnesium
spray, AIRMASK™) is **retired**. If those names appear anywhere outside git
history, they are stale.

---

## 2. UX principles

- **Calm premium lifestyle design.** British-countryside and
  Japanese-minimalist cues, natural soft colours. **No** finance-tech
  navy-and-gold treatment.
- **Mobile-first.** The app is an installable PWA; design and test at phone
  width first. Everything a reviewer needs must be testable from a phone
  browser.
- **Readable for older users.** Functional text and controls stay
  comfortably legible — generous type size, strong contrast, no thin
  low-contrast labels on primary actions.
- **Calm, low-decision flows.** Morning Check-in ≤ 3 primary actions
  (rating / waking / energy; "Add details" is opt-in). "Tonight" caps at
  **3 prioritised steps** and never shows unrelated product steps.
- **Auto day/night theme** from the device clock (`useAutoTheme()` sets
  `data-theme`). A manual user override is not wired yet.
- **Nothing customer-facing is hard-coded.** Products, questions, answers,
  tag effects, rules, audio, wallpaper, content, and feature flags are all
  DB rows, editable through Admin **without a deploy**. Adding a new
  admin-editable table is one `crud(...)` line.

---

## 3. Multilingual requirements

Three **V1 languages, all first-class** (the Sleep Intelligence master spec
§11 also lists `zh-TW` as a planned locale — the app is built so adding it
is one JSON file + two lines, but it is not shipped yet):

| Locale | Language | Notes |
|---|---|---|
| `en` | English | Fallback locale for any missing key |
| `zh-HK` | Traditional Chinese | Hong Kong Cantonese phrasing |
| `zh-CN` | Simplified Chinese | Standard Mandarin phrasing — **not** a character conversion of the `zh-HK` copy |

Rules:

- **Every UI string goes through `t()`** (`apps/web/src/i18n/index.ts`).
  No hard-coded user-facing text in components.
- Adding a locale = one JSON resource file + one line in `RESOURCES` + one
  entry in `SUPPORTED_LOCALES`. No component changes.
- Locale switches at runtime, including **after login** (Settings). The
  routed subtree is remounted on change (keyed on locale); `t()` reads a
  module variable, so a `useSyncExternalStore` subscription drives the
  re-render.
- **Layout must not break** in any language — check the longest strings
  (usually German-length English or spaced-out Traditional Chinese) don't
  overflow buttons or nav.
- Keep the three resource files key-for-key in sync; `en` is the key set of
  record.

---

## 4. Safety constraints (non-negotiable)

Full screening-not-diagnosis rules, red-flag list, and the research-claim
boundary are in `ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md` §12–§15 and
`GROWTH_MARKETING_MASTER.md` §5; `AI_OS_MASTER.md` §11 lists the
company-wide non-negotiable controls.

**Content / claims** — apply to every tier, *including internal drafts and
Admin-entered copy*:

- Never claim the product or app can **treat, solve, or cure** sleep apnoea
  (OSA), and never use the clinical term for dyspnea in customer-facing or
  internal content.
- Never depict an **AI-generated or role-played medical professional
  endorsing a product**.
- These are **process-enforced, not code-enforced**. Anyone writing into
  `Product.description` or `ContentItem` through Admin must know them.

**Decision engine** — `apps/api/src/domain/decision/*`:

- **Safety always outranks product and AI recommendation.**
  `strategyEngine.ts`'s first branch is the safety check; nothing above it
  can override an `ESCALATE`.
- The engine is **pure and replayable**: same `state + version` → same
  decision. The engines take explicit input and return explicit output and
  touch no database. The orchestrator (`decision/index.ts`) is the only
  layer that reads or writes Prisma.
- Free text is **advisory only** — it may produce tags, never a direct
  Product / Safety / Strategy outcome.
- Known bug to fix, do not rely on: `hasOpenSafetyFlag(userId)` currently
  latches — it returns true for any safety-flag question ever answered and
  never clears.

**Account ≠ Membership ≠ Product Ownership ≠ Entitlement** — four separate
models, never collapsed. `domain/entitlement.ts` (`grantEntitlement()`) is
the single place that decides "can this user use X."

---

## 5. Autonomous PM workflow

**Edmund is the product decision-maker, not the DevOps operator.** Never
ask him to inspect source code, follow a multi-step technical checklist, or
make a broad technical call the specification already answers.

- Perform every technical step you can yourself. Then ask for **the single
  smallest unavoidable owner action**, on its own — never bundle three
  asks into one. The live queue is in `OWNER_RUNBOOK.md`; update it as
  actions complete and never re-ask for something already done.
- **Every staging handoff includes:** a staging URL, the build/version,
  which demo accounts are available, what changed since last handoff,
  what's ready to test, and known limitations. No code inspection required.
- **Never push feature work directly to `main`.** Use a task branch and a
  pull request. Do not merge your own PR without review.
- **Commit in small increments** — after each coherent sub-piece that
  passes its own build/typecheck — so an interrupted run leaves completed
  work saved rather than lost.
- Escalate to Edmund only for: a genuine product decision, external account
  authorization, spending approval, a destructive DB/schema action, or an
  unresolved high-risk blocker.

### CI automation (`.github/workflows/claude-manager-dispatch.yml`)

- Triggers on issues/comments **from GitHub login `asclepiossleep-svg`**
  whose title/body contains `[MANAGER]` or `[AUDIT]` (or carrying label
  `manager-order` / `audit-fix`). The repo is **public** — this actor
  check is the security boundary; do not weaken it.
- Runs `anthropics/claude-code-action@v1` with `--model claude-sonnet-5
  --max-turns 150 --dangerously-skip-permissions`, `contents: write`,
  45-minute job timeout.
- **Kill switch:** set repo Actions variable `CLAUDE_AUTOMATION_ENABLED` to
  `false`. All three Claude workflows (`claude-manager-dispatch.yml`,
  `claude.yml`, `claude-quota-retry.yml`) check it, so one variable pauses
  every automated run without touching a file or secrets.

### Two-agent model

PM/audit agent (ChatGPT / "Codex") ↔ implementer (Claude Code), with
`[AI-STATUS]` markers and checkpoint-based usage-limit recovery. Full
detail in [`docs/ai/AI_COLLABORATION.md`](./docs/ai/AI_COLLABORATION.md)
and `AI_OS_MASTER.md` §3, §7. Three workflows, disjoint triggers:
`claude-manager-dispatch.yml` (`[MANAGER]`/`[AUDIT]`), `claude.yml`
(`@claude` mentions on issues/PRs), `claude-quota-retry.yml` (hourly
resume of `ai:paused-quota`).

---

## 6. Testing gates

Run the relevant checks **before** declaring work ready, and never hide a
failing check.

| Scope | Command | Expected |
|---|---|---|
| Whole workspace | `npm install` | clean |
| `packages/shared` | `tsc --noEmit` | zero errors |
| `apps/web` | `tsc -b` + `vite build` | builds, incl. service worker |
| `apps/api` schema | `npm run check:schema-parity` (in `apps/api`) | SQLite and staging schemas match outside datasource/header |
| Decision engine | `npx tsx apps/api/src/domain/decision/__smoketest.ts` | all assertions pass, incl. safety-always-wins and the worked review examples |

Notes:

- `apps/api`'s own `tsc --noEmit` has **pre-existing** strict-mode
  looseness (a few implicit-`any` callback params, one `TagEffect` shape
  mismatch). Not introduced by recent work; worth a cleanup pass; not a
  merge blocker on unrelated changes. Don't add new instances.
- Some sandboxes block `binaries.prisma.sh`, so `prisma generate` /
  `prisma migrate` can't run there. Vercel's build environment is
  unrestricted. This is an environment limit, not a code defect.
- The broader matrix (API contract, integration, E2E mobile, visual
  regression, security, AI eval, load, PWA, real-device) is **not built
  yet**. This repo is the foundation those run against.
- Keep the Decision Engine pure when you touch it (see §4).

---

## 7. GitHub / Vercel / Supabase operating rules

**Repository**

- `github.com/asclepiossleep-svg/asclepios-sleep` — **public**. `origin`
  over SSH.
- Feature work → task branch → PR → review → merge. No direct pushes to
  `main` for features.
- **Never commit secrets.** `.env` is gitignored. Automation auth lives
  only as GitHub Actions secrets (`CLAUDE_CODE_OAUTH_TOKEN` /
  `ANTHROPIC_API_KEY`). `JWT_SECRET` must be a real value in any deployed
  environment (it defaults to `dev-secret-change-me`).
- **Local AIOS/Rex agent tooling is machine-local and gitignored** —
  `.aios/`, `.contextdb-enable`, `.claude/settings.local.json`, `.gemini/`.
  Never commit it. These doc files each end with an
  `<!-- AIOS: .aios/context-db/index.json -->` marker so local Rex/AIOS
  context indexing keeps recognising them — keep that line.

**Deployment target: Vercel + Supabase** (not generic Postgres/Docker;
`docker-compose.yml` + `scripts/backup.sh|restore.sh` are kept only for an
optional self-host path). **Not yet deployed** — see `DEPLOYMENT.md` for
the owner steps.

- **Two Vercel projects, one repo**, distinguished by Root Directory:
  `apps/api` (Express as a single serverless function via
  `apps/api/api/index.ts` + `apps/api/vercel.json`) and `apps/web` (static
  Vite build).
- `apps/api/src/app.ts` is the **one place** the API is assembled —
  imported by both the serverless entry and local dev (`src/index.ts`).

**Database / Prisma**

- `apps/api/prisma/schema.prisma` (**SQLite**) is the local-dev default and
  is **never** repointed at Postgres. `schema.staging.prisma`
  (**Postgres/Supabase**) is the deployed schema. `check:schema-parity`
  fails the build if the two drift in their actual models.
- **There is no `prisma/migrations/` directory.** `vercel-build` ships
  schema changes with `prisma db push --accept-data-loss`. Any schema
  change is therefore potentially destructive — it must get **explicit
  human review** and must never be auto-merged.
- Do not auto-merge changes to: schema/migrations, auth/authorization,
  payments, destructive data operations, or production environment config.
- Supabase provides `DATABASE_URL` + `DIRECT_URL` (set in Vercel env). The
  owner pastes these once (`DEPLOYMENT.md` §4).

**Local dev is fully independent** — SQLite file, no cloud accounts:

```bash
npm install
cp .env.example apps/api/.env
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api      # base config + 9 demo accounts
npm run dev:api                           # http://localhost:4000
npm run dev:web                           # http://localhost:5173
```

Log in via the staging Demo Selector (9 `*@asclepios.test` accounts) or
Email OTP — `/auth/otp/request` returns `devCode` outside
`NODE_ENV=production`.

---

## 8. Repo structure quick reference

```
apps/api          TypeScript + Express + Prisma. Serverless entry: apps/api/api/index.ts
apps/web          TypeScript + React 18 + Vite. Installable PWA.
packages/shared   Single source of truth for every enum/vocabulary term (tags,
                  action codes, severity buckets, audio presets, wake styles,
                  feature flags, the 9 demo accounts). Built first (postinstall).
                  Both apps import from here; nothing is redefined per-app.
scripts/          Postgres backup/restore for the optional self-host path.
DEPLOYMENT.md     Vercel + Supabase deployment plan (owner steps in §1).
OWNER_RUNBOOK.md  Owner-communication protocol + the live one-action queue.
README.md         Full engineering scaffold brief and build-sequence status.
```

<!-- AIOS: .aios/context-db/index.json -->
