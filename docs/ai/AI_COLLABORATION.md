# AI collaboration workflow

This repository uses GitHub as the durable shared workspace between Edmund,
the PM/audit agent (ChatGPT / Codex), and the implementation agent
(Claude Code). Carried forward and adapted from
`codex/ai-collaboration-setup`; it sits alongside `AGENTS.md` (canonical
operating context) and the master specifications in `docs/`.

## Roles

- **Edmund** — product direction and final business decisions.
- **PM / audit agent (ChatGPT, "Codex")** — CEO Office / AI PMO: turns
  direction into scoped issues with acceptance criteria, reviews diffs and
  evidence, guards design and safety. See
  `docs/company/AI_OS_MASTER.md` §3, §7.
- **Claude Code** — primary implementation agent.
- **GitHub** — task state, agent-to-agent messages, code history, checks,
  approvals.
- **Vercel** — preview and production deployment evidence.
- **Supabase** — database, auth, storage, and authorization evidence.

## Normal task flow

1. The PM agent creates a GitHub issue: scope, product context, acceptance
   criteria, exclusions.
2. The issue mentions `@claude`; Claude creates a branch, implements,
   tests, commits incrementally, and opens or updates a pull request.
3. Claude posts `[AI-STATUS] READY_FOR_AUDIT` with test results and
   limitations.
4. The PM agent reviews the diff and evidence, then approves or posts one
   consolidated review mentioning `@claude`.
5. Claude fixes issues on the same branch and returns the PR to audit.
6. After required checks pass and material review threads are resolved, the
   PM agent (or Edmund) may merge. Vercel then deploys via its GitHub
   integration.
7. Edmund is notified only for a product decision, an unavoidable account
   authorization, spending approval, a destructive action, or an
   unresolved high-risk blocker.

## Durable status markers

Post exactly one active marker per work unit; a later marker supersedes an
earlier one.

- `[AI-STATUS] RUNNING` — work has started on the current unit.
- `[AI-STATUS] CHECKPOINT` — a coherent increment is committed; include the
  commit SHA, completed work, next action, tests, and limitations.
- `[AI-STATUS] READY_FOR_AUDIT` — implementation is complete enough for
  independent review.
- `[AI-STATUS] BLOCKED` — a non-quota technical or product blocker needs
  diagnosis or a decision.
- `[AI-STATUS] PAUSED-QUOTA` — Claude stopped because subscription usage is
  temporarily unavailable; the hourly retry workflow will try again.

## Workflows

Two GitHub Actions workflows support this, and they have **disjoint
triggers** by convention — keep it that way:

| Workflow | Trigger | Purpose |
|---|---|---|
| `.github/workflows/claude-manager-dispatch.yml` | Issue/comment from `asclepiossleep-svg` containing `[MANAGER]` / `[AUDIT]` (or label `manager-order` / `audit-fix`) | One bounded autonomous manager/audit run |
| `.github/workflows/claude.yml` | Comment / review / issue containing `@claude`, or an issue assigned to the bot | Interactive `@claude` responder on issues and PRs, with quota/blocker classification |
| `.github/workflows/claude-quota-retry.yml` | Hourly schedule | Re-pings issues labelled `ai:paused-quota` to resume from the last checkpoint |

Kill switch for the manager dispatch workflow: set repo Actions variable
`CLAUDE_AUTOMATION_ENABLED` to `false`.

## Usage-limit recovery

`claude.yml` inspects its own sanitised execution result after a failed
run. Recognised usage/rate-limit failures get the `ai:paused-quota` label
and a `PAUSED-QUOTA` comment; `claude-quota-retry.yml` then posts an
hourly continuation request and clears the label. Before continuing,
Claude reconstructs state from commits and the latest checkpoint.

Unrecognised failures get `ai:blocked` and are **not** retried blindly —
the PM agent diagnoses them from the workflow logs and decides whether to
fix, retry, or request the minimum owner action.

Recovery is checkpoint-based, not dependent on a private chat session, so
it works across machines and after a session ends.

## Safety rules

- No agent writes directly to `main` for feature work.
- No secrets in the repository. Automation auth lives only as the GitHub
  Actions secret `CLAUDE_CODE_OAUTH_TOKEN`.
- Do not auto-merge database migrations, auth/authorization changes,
  payment changes, destructive data operations, or production environment
  changes without explicit review. (This repo ships schema changes with
  `prisma db push --accept-data-loss` and has no migration history — treat
  every schema change as destructive; see `AGENTS.md` §7.)
- This is a public repository: keep prompts and issue content restricted to
  trusted collaborators.
- Avoid agent loops: only an explicit `@claude` mention triggers Claude,
  and only the GitHub Actions bot may trigger automated retries.

## Adding another project

Each repository needs its own workflow files and authentication because the
implementation agent loads project context from that repository. Reuse
`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, this file, and the three workflows
as a template. Project-specific decisions stay in that project's
repository; cross-project business principles are copied into that
project's own docs rather than assumed from chat memory. See
`docs/company/AI_OS_MASTER.md` §12.
