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

Three GitHub Actions workflows support this, and the two Claude-invoking
ones have **disjoint triggers** by convention — keep it that way:

| Workflow | Trigger | Purpose |
|---|---|---|
| `.github/workflows/claude-manager-dispatch.yml` | Issue/comment from `asclepiossleep-svg` containing `[MANAGER]` / `[AUDIT]` (or label `manager-order` / `audit-fix`) | One bounded autonomous manager/audit run |
| `.github/workflows/claude.yml` | Comment / review / issue containing `@claude`, or an issue assigned to the bot | Interactive `@claude` responder on issues and PRs, with quota/blocker classification |
| `.github/workflows/claude-quota-retry.yml` | Hourly schedule | Re-pings issues labelled `ai:paused-quota` to resume from the last checkpoint |

**Kill switch:** set repo Actions variable `CLAUDE_AUTOMATION_ENABLED` to
`false`. All three workflows check it in their job `if:` condition, so one
variable pauses every automated Claude run — including the hourly quota
retry loop — without editing a file or touching secrets.

## Usage-limit recovery

`claude.yml` inspects its own sanitised execution result after a failed
run. Recognised usage/rate-limit failures get the `ai:paused-quota` label
and a `PAUSED-QUOTA` comment; `claude-quota-retry.yml` then posts an
hourly continuation request and clears the label. Before continuing,
Claude reconstructs state from commits and the latest checkpoint.

Unrecognised failures get `ai:blocked` and are **not** retried blindly —
the PM agent diagnoses them from the workflow logs and decides whether to
fix, retry, or request the minimum owner action.

The retry has **no maximum count** — a genuinely stuck issue is re-pinged
every hour until the quota returns or someone removes the
`ai:paused-quota` label (or flips the kill switch). Each ping is one
bounded `claude.yml` run.

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

## Partial E2E checkpoint

The first live run of the three workflows above, from an
`@claude`-triggered issue (asclepiossleep-svg/asclepios-sleep#8), did
**not** complete end-to-end. This section separates what was directly
observed on that run from what is only inferred by reading the workflow
files — do not treat source inspection alone as verification.

**Observed on issue #8 / PR #9 (commit `dfc547f`):**

- Claude read the repository instructions, created a branch, committed,
  and pushed the documentation change.
- The triggering `claude.yml` run did not finish successfully; the
  "Classify Claude result" step matched a usage/rate-limit pattern in the
  run output, so the issue was labelled `ai:paused-quota` with an
  `[AI-STATUS] PAUSED-QUOTA` comment. Claude did not reach
  `READY_FOR_AUDIT`.
- Claude did not open a pull request and did not wait for or report CI
  checks. This matches the workflow as written: `claude.yml`'s
  `--allowedTools` list (`Bash(npm install|run build|run test|run
  lint|run typecheck)`, `Bash(git status|diff|log)`, `Edit`, `Write`,
  `Read`, `Glob`, `Grep`) has no `gh pr create` or PR-creation tool, so
  automatic PR creation is currently impossible from this path, not just
  unexercised.
- Edmund opened PR #9 manually from the pushed branch.
- Vercel's `asclepios-sleep-web` and `asclepios-sleep-api` preview builds
  for PR #9 later reported green/Ready.

**Configuration read from the workflow files — not yet proven by a clean
test, and in two cases contradicted by the files themselves:**

- **Trigger is not owner-only as previously stated.**
  `claude-manager-dispatch.yml`'s `if:` accepts
  `github.event.issue.user.login == 'asclepiossleep-svg' ||
  github.event.comment.user.login == 'asclepiossleep-svg'`. On an
  issue the owner opened, a `[MANAGER]`/`[AUDIT]` comment from *any other
  account* still satisfies that OR and would run the job with
  `contents: write` / `issues: write` / `pull-requests: write`. This gap
  is unresolved.
- **`CLAUDE_AUTOMATION_ENABLED` kill switch.** All three workflows include
  `vars.CLAUDE_AUTOMATION_ENABLED != 'false'` in their job-level `if:`.
  This is a straightforward config read (not exercised live in this run):
  setting the repo Actions variable to `false` should pause every
  automated Claude run, including the hourly quota-retry loop, without
  editing a workflow file or touching a secret.
- **Quota resume is unverified and likely non-functional as written.**
  `claude-quota-retry.yml` posts its `@claude Resume...` comment using
  `GH_TOKEN: ${{ github.token }}` — the default `GITHUB_TOKEN`. GitHub
  does not start new workflow runs for events created by that token
  (`workflow_dispatch`/`repository_dispatch` excepted), so this comment is
  expected not to trigger `claude.yml` at all. The workflow then clears
  `ai:paused-quota` unconditionally, whether or not a Claude run actually
  resumed — issue #8 having the label cleared is not evidence a retry
  worked. Do not treat the unlimited-retry (no maximum count) design as an
  accepted default until a resume has been proven to actually dispatch a
  Claude run.
- **Approval boundary is not demonstrated end-to-end.** `claude.yml`
  cannot submit or approve a PR review, and per the normal task flow a
  human/PM merges after checks pass — but this run proves automatic PR
  creation is missing from `claude.yml`'s allowlist, and
  `claude-manager-dispatch.yml`'s prompt separately instructs Claude to
  "commit each sub-piece to main as soon as it is complete," i.e.
  direct-to-main for that workflow, not branch → PR → review. No run has
  yet exercised branch → automatic PR → check-wait → human merge in full.

**Follow-up:** the trigger, token, and prompt corrections above are
tracked as the post-merge hotfix requested on PR #7
(asclepiossleep-svg/asclepios-sleep#7); that hotfix, not this
documentation change, is where they should be fixed. This section should
only be upgraded from "partial checkpoint" to "verified" after a clean
test proves: an untrusted commenter is rejected, the owner is accepted,
exactly one explicit retry dispatch starts exactly one Claude run with no
duplicate loop, automatic PR creation works, and checks are reported.

## Adding another project

Each repository needs its own workflow files and authentication because the
implementation agent loads project context from that repository. Reuse
`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, this file, and the three workflows
as a template. Project-specific decisions stay in that project's
repository; cross-project business principles are copied into that
project's own docs rather than assumed from chat memory. See
`docs/company/AI_OS_MASTER.md` §12.
