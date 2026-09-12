# Goal #87 — Automation Loop Validation Record

Status: harmless validation artifact only. No product, application, or
deployment behavior is affected by this file.

- Goal ID: `AUTOMATION-LOOP-VALIDATION-001`
- Goal Issue: #87
- Purpose: validate that a Rex execution session can, end to end, create a
  feature branch, commit a file, push it, and open a pull request against
  `main` — after the non-interactive Rex write-permission fix merged as
  `f767a217591e36ff74de9979515e0dead9f2586f` (PR #89).
- Base commit this record was branched from: `f767a217591e36ff74de9979515e0dead9f2586f`
- Branch: `rex/87-automation-loop-validation`

This file exists only to prove the branch → commit → push → PR chain
works in this execution context. It is not referenced by any application
code, build, or deployment configuration, and is safe to keep or remove
without affecting behavior.

## Retest after PR #94

- Retest instruction: `[MANAGER] RETEST AUTOMATION-LOOP-VALIDATION-001 after
  PR #94 merge` (Goal Issue #87).
- This branch was merged forward onto `main` at commit
  `05d534818ada7c957ac3a47adc9e2e3c7f576973` (PR #94, "automation:
  explicitly reconcile fallback handoffs") to prove the branch/commit/PR
  chain still works on the current main control plane, which now includes
  deterministic evidence profiles and explicit fallback-handoff
  reconciliation.
- Evidence Profile for this validation Goal: `CODE_ONLY` — no Preview URL
  or Visual Evidence applies; commit SHA, PR, and checks are the required
  evidence.

## Retest after PR #95

- Retest instruction: `[MANAGER] RETEST AUTOMATION-LOOP-VALIDATION-001
  after PR #95 merge` (Goal Issue #87), requiring proof that
  controller-triggered `github-actions[bot]` dispatches of Rex succeed,
  followed by independent PR/commit binding verification, with no owner
  "continue" in between.
- This branch was merged forward onto `main` at commit
  `d3b1d5ab44d08c491a9271cb524291b418e7fcc2` (PR #95, "automation: allow
  controller bot to launch bounded Rex continuation").
- Root-cause finding on the prior controller-dispatched failure (Run
  `34658756028`, `Rex Outcome: NO_PROGRESS`): the Amanda Goal Controller's
  automatic `gh workflow run claude-manager-dispatch.yml -f issue_number=
  ... -f manager_instruction=...` call is itself made with the default
  `github.token`, so the dispatched `workflow_dispatch` run's actor is
  `github-actions[bot]`. `claude-manager-dispatch.yml`'s own preflight step
  already allows any `workflow_dispatch` event unconditionally, but the
  `anthropics/claude-code-action` step underneath it has a separate,
  independent bot-actor allowlist; without an explicit `allowed_bots`
  input the action rejected the bot-triggered event, the executor step
  never produced output, `steps.rex.outputs.conclusion != 'success'`, and
  the workflow's own "Preserve executor failure" step then exited 1 —
  matching the observed run log (job `claude-respond`, step "Preserve
  executor failure", `exit 1`) and the fallback `NO_PROGRESS` handoff.
  PR #95 adds `allowed_bots: "github-actions"` to that step, which is the
  targeted fix for exactly this actor-identity rejection. This fix has not
  yet been exercised by an actual controller → `workflow_dispatch` → Rex
  cycle (this Rex run itself was dispatched directly by an owner
  `[MANAGER]` comment, not by the controller), so the fix is
  code-reviewed and reasoned-correct but remains `UNKNOWN`/unexercised
  until the controller performs its next automatic dispatch.
- Independent PR/commit binding verification performed this run against
  `https://github.com/asclepiossleep-svg/asclepios-sleep/pull/91`:
  - `gh pr view 91` reports `state: OPEN`, `headRefName:
    rex/87-automation-loop-validation`, `headRefOid:
    dc88c82d97e136bb7f89113c157439a492c24f14` — matching exactly the
    `Commit SHA` recorded in the prior `Rex Outcome: PROGRESS` handoff
    (Run `34658399572`). The PR head has not silently drifted from the
    reported evidence commit.
  - Required CODE_ONLY checks on that commit are all `SUCCESS`:
    `structural-health`, `browser-smoke-gate`, `required-build-gate`,
    `visual-regression-gate`. The four `Vercel – *` deployment checks
    report `FAILURE` with target `...?upgradeToPro=build-rate-limit` —
    an infra quota condition, not a code defect, and not part of the
    CODE_ONLY evidence requirement for this docs-only validation Goal.
  - This retest's own commit (recorded below) supersedes `dc88c82` as the
    new PR #91 head once pushed; the binding check above is therefore a
    point-in-time verification of the pre-retest state, immediately
    before this run's own commit moves the head forward again.
