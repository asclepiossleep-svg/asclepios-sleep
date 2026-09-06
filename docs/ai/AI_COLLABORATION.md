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

## End-to-end verification

First end-to-end audit of the three workflows above, performed against
`main` from an `@claude`-triggered issue (asclepiossleep-svg/asclepios-sleep#8).

- **Repository owner-only trigger.** Each workflow gates on the triggering
  actor before doing anything else. `claude-manager-dispatch.yml` checks
  the issue/comment author's login (`github.event.issue.user.login` /
  `github.event.comment.user.login`) equals `asclepiossleep-svg`, plus a
  `[MANAGER]`/`[AUDIT]` marker in the title, body, or label.
  `claude.yml` checks `github.actor == github.repository_owner` (or the
  `github-actions[bot]` service account posting a scheduled retry), plus an
  `@claude` mention or an issue assignment. The two checks use different
  mechanics (a hardcoded login string vs. the dynamic
  `repository_owner` comparison) but both resolve to "only the repo owner
  can spend the linked Anthropic budget or gain write access" — this is
  the security boundary for triggers on this **public** repository.
- **`CLAUDE_AUTOMATION_ENABLED` kill switch.** All three workflows —
  `claude-manager-dispatch.yml`, `claude.yml`, and
  `claude-quota-retry.yml` — include `vars.CLAUDE_AUTOMATION_ENABLED !=
  'false'` in their job-level `if:` condition. Setting the repo Actions
  variable to `false` pauses every automated Claude run, including the
  hourly quota-retry loop, without editing a workflow file or touching a
  secret. Any other value (or the variable being unset) leaves automation
  enabled.
- **Quota pause and retry behaviour.** `claude.yml`'s "Classify Claude
  result" step inspects the run's execution output after a non-success
  conclusion. Output matching usage/rate-limit patterns (`usage limit`,
  `rate limit`, `quota`, `credit balance`, `429`, etc.) gets the
  `ai:paused-quota` label and an `[AI-STATUS] PAUSED-QUOTA` comment;
  anything else gets `ai:blocked` and an `[AI-STATUS] BLOCKED` comment for
  the PM agent to diagnose manually — unrecognised failures are not
  retried blindly. `claude-quota-retry.yml` runs hourly (`17 * * * *`),
  re-pings every open issue labelled `ai:paused-quota` with a `@claude
  Resume...` comment referencing the latest checkpoint, then clears the
  label. There is no maximum retry count; a concurrency group prevents a
  manual dispatch from overlapping the scheduled run.
- **Pull-request approval boundary.** The workflows grant Claude
  `contents: write`, `pull-requests: write`, and `issues: write`. In
  `claude.yml`, the tool allow-list (`--allowedTools` in `claude_args`,
  accumulated with `claude-code-action`'s own scoped defaults) lets Claude
  create the branch and commits, **open** a pull request
  (`Bash(gh pr create:*)`), and read that PR and its checks back
  (`Bash(gh pr view:*)`, `Bash(gh pr checks:*)` — both read-only). It is
  **not** granted `gh pr merge`, `gh pr close`, `gh pr edit`,
  `gh pr review`, unrestricted `gh api`, or arbitrary shell — those have
  no allow rule and are denied (the workflow does not use
  `--dangerously-skip-permissions`). `claude-code-action` additionally
  cannot submit a formal GitHub PR review or approve a PR, and its system
  prompt forbids force-pushing, rebasing, and pushing outside its own
  branch. Merging stays a separate, human-gated step: per the normal task
  flow above, the PM agent or Edmund reviews the diff and evidence and
  merges only after required checks pass; schema, auth/authorization,
  payment, and other destructive-change categories additionally require
  explicit human review before merge (`AGENTS.md` §7). No agent,
  including Claude, merges its own pull request.

## Automatic PR creation verified

**2026-09-06** — Confirmed end-to-end from an `@claude`-triggered issue
(asclepiossleep-svg/asclepios-sleep#12) that `claude.yml`'s `--allowedTools`
grants Claude `Bash(gh pr create:*)` plus the read-only `Bash(gh pr
view:*)` and `Bash(gh pr checks:*)`, and nothing beyond that set — no `gh
pr merge`, `gh pr close`, `gh pr edit`, `gh pr review`, unrestricted `gh
api`, or arbitrary shell. Claude may create pull requests on its own task
branch and report their URL and check results, but may **never approve or
merge** a pull request; merging stays a separate, human-gated step per the
normal task flow above.

## Adding another project

Each repository needs its own workflow files and authentication because the
implementation agent loads project context from that repository. Reuse
`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, this file, and the three workflows
as a template. Project-specific decisions stay in that project's
repository; cross-project business principles are copied into that
project's own docs rather than assumed from chat memory. See
`docs/company/AI_OS_MASTER.md` §12.
