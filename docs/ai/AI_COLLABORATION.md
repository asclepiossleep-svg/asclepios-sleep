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

First automation audit of the three workflows above, attempted against
`main` from an `@claude`-triggered issue
(asclepiossleep-svg/asclepios-sleep#8). This is **not** a completed
end-to-end validation — corrected here per the consolidated manager/audit
review on PR #11 (comment `5556001887`), which found the prior version of
this section overstated both the #8 result and the security posture. That
review also cross-references the post-merge test instruction in PR #7 and
reviews `5123398154` / `5123426427`.

**What #8 actually showed:**

- Branch creation, commit, and push succeeded.
- The triggered Claude run itself ended with an error partway through —
  not a clean `READY_FOR_AUDIT`.
- The pull request that followed (PR #9) was opened **manually**, not by
  the workflow's automatic `gh pr create`.
- Vercel's preview/production checks passed once that manually-opened PR
  existed.
- The issue remained labelled `ai:paused-quota` afterwards rather than
  resolving cleanly.

Automatic PR creation via the `Bash(gh pr create:*)` allow rule added in
PR #11 is therefore still **unverified**. Issue #8 stays open; the next
step is a fresh, harmless, documentation-only issue opened after PR #11's
independent review and merge, used to prove one fully automatic
branch → commit → push → PR → check-report cycle, with the run URL and
resulting PR URL recorded here or in that issue.

**Confirmed by design (static review of the workflow files as of PR
#11):**

- **`CLAUDE_AUTOMATION_ENABLED` kill switch.** All three workflows —
  `claude-manager-dispatch.yml`, `claude.yml`, and
  `claude-quota-retry.yml` — include `vars.CLAUDE_AUTOMATION_ENABLED !=
  'false'` in their job-level `if:` condition. Setting the repo Actions
  variable to `false` pauses every automated Claude run, including the
  hourly quota-retry loop, without editing a workflow file or touching a
  secret.
- **`claude.yml`'s pull-request tool allow-list is narrow.** PR #11 added
  only `Bash(gh pr create:*)` plus the read-only `Bash(gh pr view:*)` and
  `Bash(gh pr checks:*)` to `--allowedTools`, so Claude can open a PR from
  this workflow and read it and its checks back. It is **not** granted
  `gh pr merge`, `gh pr close`, `gh pr edit`, `gh pr review`, unrestricted
  `gh api`, or arbitrary shell — those have no allow rule and are denied,
  and `claude.yml` does not use `--dangerously-skip-permissions`.
  `claude-code-action` additionally cannot submit a formal GitHub PR
  review or approve a PR. Merging stays a separate, human-gated step: the
  PM agent or Edmund reviews the diff and evidence and merges only after
  required checks pass — but note this is currently a **process**
  statement, not a verified technical control; this file does not confirm
  branch protection or an equivalent required-review merge gate is
  configured on `main`.

**Known unresolved gaps (not introduced or fixed by PR #11 — tracked as a
separate hotfix, not to be combined into a PR-creation permission
change):**

- **Public-repo trigger bypass in `claude-manager-dispatch.yml`.** Its
  `if:` accepts the event when *either* the original issue's opener *or*
  the triggering comment's author is `asclepiossleep-svg`
  (`github.event.issue.user.login` / `github.event.comment.user.login`).
  Because the issue-opener check does not require the *comment* to also
  be from the owner, any issue Edmund has ever opened can later be
  hijacked: an arbitrary GitHub user commenting `[MANAGER]`/`[AUDIT]` on
  that issue satisfies the author check and triggers a
  `--dangerously-skip-permissions` run with `contents: write`,
  `issues: write`, and `pull-requests: write` on this public repository.
- **`--dangerously-skip-permissions` and `show_full_output: true`** are
  still set in `claude-manager-dispatch.yml`, both left over from prior
  debugging rather than narrowed.
- **The hourly quota re-ping in `claude-quota-retry.yml` is not
  effective.** It posts its `@claude Resume...` comment using the default
  `GH_TOKEN: ${{ github.token }}`; GitHub does not fire downstream
  workflow runs for events created by the default `GITHUB_TOKEN` (to
  prevent recursive-workflow loops), so this comment does not actually
  re-trigger `claude.yml`. The workflow clears the `ai:paused-quota`
  label immediately after posting regardless, so a stuck issue silently
  drops out of the retry loop instead of being retried hourly as the
  "Usage-limit recovery" section above describes. Retries also have no
  maximum count.
- **The manager prompt hardcodes `main` and a specific scope.**
  `claude-manager-dispatch.yml`'s prompt instructs the agent to commit
  sub-pieces directly to `main` and frames every run as "continuing the
  Fix #5 UX/IA correction track."

Do not treat repository-owner-only security, working quota recovery,
bounded retries, or completed E2E validation as established until the
items above are fixed and a fresh automatic PR-creation test is
recorded.

## Adding another project

Each repository needs its own workflow files and authentication because the
implementation agent loads project context from that repository. Reuse
`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, this file, and the three workflows
as a template. Project-specific decisions stay in that project's
repository; cross-project business principles are copied into that
project's own docs rather than assumed from chat memory. See
`docs/company/AI_OS_MASTER.md` §12.
