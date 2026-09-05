# Claude Code — operating instructions for this repository

**Read [`AGENTS.md`](./AGENTS.md) first.** It is the canonical operating
context: Asclepios Sleep product direction, UX principles, multilingual
requirements, safety constraints, the autonomous PM workflow, testing
gates, and the GitHub / Vercel / Supabase rules. This file adds only what
is specific to running Claude Code here.

Then read `OWNER_RUNBOOK.md` and, for anything you're about to change, the
relevant source and the issue / PR acceptance criteria.

## Role

Claude Code is the **primary implementation agent** for this repo. Codex
(where used) is the product-manager / audit agent. GitHub issues, PRs,
reviews, and commits are the shared channel — never ask Edmund to relay
messages between agents.

## Non-negotiables (full detail in `AGENTS.md`)

- **Never push feature work directly to `main`.** Branch + PR, and don't
  merge your own PR without review.
- **Commit in small, self-checking increments** so a usage-limit or
  turn-cap stop leaves completed work saved.
- **Safety outranks everything.** Don't weaken the decision engine's
  safety-first branch or its purity (engines touch no DB; `decision/index.ts`
  is the only Prisma layer). Never write content that claims to treat/cure
  sleep apnoea or depicts an AI medical professional endorsing a product.
- **No secrets in git.** `.env` is gitignored; automation auth is a GitHub
  Actions secret only.
- **Edmund gets one smallest unavoidable action at a time** — never a
  technical checklist. Keep the queue in `OWNER_RUNBOOK.md` current.
- Run the `AGENTS.md` §6 testing gates before declaring work ready; never
  hide a failing check.

## Local environment specifics

- **Local AIOS/Rex tooling is active on this machine and must keep
  working.** `.aios/`, `.contextdb-enable`, `.claude/settings.local.json`,
  and `.gemini/` are machine-local and gitignored — never stage or commit
  them, and don't edit the AIOS hook config. This file ends with an
  `<!-- AIOS: .aios/context-db/index.json -->` marker so the local context
  indexer still recognises it; keep that line on the last row.
- `.claude/settings.local.json` registers a **`PreToolUse` Bash hook** that
  rewrites shell output into compact JSON "packets" — multi-line `cat`,
  `head`, `git log`, `git diff` output comes back summarised, not verbatim.
  **Use the Read tool for file contents** and write command output to a
  file in the scratchpad then Read it when you need the exact text.
- The CI automation model (`claude-manager-dispatch.yml`) already runs
  Claude with `--dangerously-skip-permissions`; keep the
  `asclepiossleep-svg` + `[MANAGER]`/`[AUDIT]` trigger guard intact.

## Working rhythm

1. Confirm scope against the issue / request. If it's a genuine product
   decision, a destructive schema/DB migration, a paid-service choice, or
   unresolvable from the repo — stop and ask in the thread instead.
2. Branch. Implement the smallest correct, complete change.
3. Build / typecheck the affected workspace(s). Commit per sub-piece.
4. Open or update the PR with what changed, commit SHAs, and build/test
   status. State plainly what's verified and what isn't.
5. Address review on the same branch. Do not merge.

<!-- AIOS: .aios/context-db/index.json -->
