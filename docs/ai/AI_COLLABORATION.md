# AI collaboration workflow

This repository uses GitHub as the durable shared workspace between Edmund, Codex, and Claude Code.

## Roles

- **Edmund:** product direction and final business decisions.
- **Codex:** manager, specification writer, design guardian, auditor, and secondary coder.
- **Claude Code:** primary implementation agent.
- **GitHub:** task state, agent-to-agent messages, code history, checks, and approvals.
- **Vercel:** preview and production deployment evidence.
- **Supabase:** database, authentication, storage, and authorization evidence.

## Normal task flow

1. Codex creates a GitHub issue containing scope, product context, acceptance criteria, and exclusions.
2. The issue mentions `@claude`; Claude creates a branch, implements, tests, commits, and opens or updates a pull request.
3. Claude posts `[AI-STATUS] READY_FOR_AUDIT` with test results and limitations.
4. Codex reviews the diff and evidence. Codex either approves or posts one consolidated review mentioning `@claude`.
5. Claude fixes issues on the same branch and returns the PR to audit.
6. After required checks pass and material review threads are resolved, Codex may merge. Vercel then deploys through its GitHub integration.
7. Edmund is notified only when a product decision or unavoidable account authorization is required, or when the result is ready for owner testing.

## Durable status markers

- `[AI-STATUS] RUNNING` — an agent has started the current work unit.
- `[AI-STATUS] CHECKPOINT` — a coherent increment is committed; include the commit, completed work, next action, tests, and limitations.
- `[AI-STATUS] READY_FOR_AUDIT` — implementation is complete enough for independent review.
- `[AI-STATUS] BLOCKED` — a non-quota technical or product blocker needs diagnosis or a decision.
- `[AI-STATUS] PAUSED-QUOTA` — Claude stopped because subscription usage is unavailable; the hourly retry workflow will try again.

Only one active status should describe a task. A later marker supersedes an earlier one.

## Usage-limit recovery

The Claude workflow inspects its own sanitized execution result after a failed run. Recognised usage/rate-limit failures receive the `ai:paused-quota` label. A scheduled workflow retries labelled tasks hourly by posting a continuation request. Before continuing, Claude reconstructs state from commits and the latest checkpoint.

Unrecognised failures receive `ai:blocked` and are not retried blindly. Codex diagnoses those failures from workflow logs and decides whether to fix, retry, or request the minimum owner action.

This recovery is checkpoint-based rather than dependent on a private chat session, so it works across machines and after a session ends.

## Safety rules

- No agent writes directly to `main` for feature work.
- No secrets are committed. Claude authentication is stored only as the GitHub Actions secret `CLAUDE_CODE_OAUTH_TOKEN`.
- Do not auto-merge database migrations, authentication/authorization changes, payment changes, destructive data operations, or production environment changes without explicit review.
- Keep prompts and issue content restricted to trusted repository collaborators; this is a public repository.
- Avoid agent loops: only explicit `@claude` requests trigger Claude, and only the exact GitHub Actions bot is allowed to trigger automated retries.

## Adding another project

Each repository needs its own workflow file and authentication access because Claude loads project context from that repository. Reuse these three instruction files and the two workflows as a template. Project-specific decisions remain in that project's repository; cross-project business principles should be copied into its own product invariants rather than assumed from chat memory.

