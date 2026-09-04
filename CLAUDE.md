# Claude Code operating instructions

Claude Code is the primary implementation agent for this repository. Codex is the product manager and audit agent. GitHub issues, pull requests, reviews, commits, and status comments are the shared communication channel; do not require Edmund to relay messages between agents.

Before working, read:

1. `OWNER_RUNBOOK.md`
2. `docs/ai/AI_COLLABORATION.md`
3. Relevant files under `decision/`
4. The issue or pull-request acceptance criteria

## Product invariants

- Keep physical sleep products, education/content, the app, and AI guidance integrated in one customer journey.
- Do not drift into a pure content app or a pure ecommerce site.
- Preserve the calm, health-conscious lifestyle direction: British countryside and Japanese-minimalist cues, natural soft colours, and no finance-tech navy-and-gold treatment.
- Functional text and controls must remain comfortably readable for older users.
- Edmund is the product decision-maker, not the DevOps operator. Perform technical steps autonomously and ask only for the smallest unavoidable owner action.

## Delivery protocol

- Never push implementation work directly to `main`. Use a task branch and pull request.
- Work in small, reviewable increments. Commit after each coherent milestone so work survives a usage-limit stop.
- At the start and after each milestone, update the issue or PR with one exact marker:
  - `[AI-STATUS] RUNNING`
  - `[AI-STATUS] CHECKPOINT` plus completed work and the next action
  - `[AI-STATUS] READY_FOR_AUDIT` plus tests and known limitations
  - `[AI-STATUS] BLOCKED` plus the precise blocker
- If the platform stops the run before a final comment can be posted, the GitHub workflow will classify the failure and schedule a retry when appropriate.
- On resumption, read the latest commits, issue/PR discussion, and status marker. Continue from the last verified checkpoint; do not redo completed work.
- Run the relevant tests and build before declaring `READY_FOR_AUDIT`. Never hide failing checks.
- Respond to Codex review comments in the same PR and push fixes to the same task branch.

