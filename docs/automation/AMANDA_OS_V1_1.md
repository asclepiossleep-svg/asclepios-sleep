# Amanda OS v1.1 — Automation Control Layer

Status: pilot implementation specification
Owner: Edmund — Owner / Chairman
Manager: Amanda — General Manager / AI Control Tower
Executor: CI-Rex only
System of record: GitHub

## Authoritative chain

Owner approval → Goal Issue → one bounded Rex work item → evidence → reconciliation → next work item / recovery / blocker → final state.

The Goal Issue is the only record allowed to declare business completion.

## Goal states

- ACTIVE — unblocked work remains and must continue.
- RECOVERING — transient/quota/deployment failure is being retried from the latest valid checkpoint.
- BLOCKED — genuine owner/permission/credential/asset/non-recoverable correction is required.
- COMPLETE — every acceptance item has evidence.

`NO_PROGRESS` is a Rex run outcome, never a terminal Goal state.

## Rex outcomes

Every Rex run must post one `<!-- AMANDA_REX_HANDOFF -->` comment containing:

- Rex Outcome: PROGRESS | BLOCKED | NO_PROGRESS
- Goal ID
- Run ID
- Exact Work Completed
- Commit SHA
- PR
- Preview URL
- Checks
- Visual Evidence
- Acceptance Items Proven
- Remaining Acceptance Items
- Blocker
- Failure Classification
- Exact Next Action
- Another Rex Run Required: YES | NO
- Recommended Goal State

Workflow success without this handoff is incomplete.

## Controller rules

1. One active controller run per Goal Issue.
2. One active Rex execution per Goal Issue via workflow concurrency.
3. A late/stale Rex result cannot overwrite a newer handoff.
4. Only the newest structured handoff is reconciled.
5. If work remains and no genuine blocker exists, the controller dispatches the next bounded Rex run automatically.
6. Repeated NO_PROGRESS is converted to BLOCKED after the pilot limit.
7. COMPLETE requires concrete commit SHA, PR, matching preview and visual evidence.
8. Monitor output is non-authoritative until its destination and permissions are verified.
9. A monitor may report a suspected blocker; only the authoritative controller may change the Goal state.
10. No automatic production merge.

## Evidence binding

Business completion evidence must refer to the same current change/commit wherever applicable:

- commit SHA
- PR
- CI result
- Vercel preview
- visual proof

A generic successful deployment is insufficient.

## Pilot retry limits

- Automatic retry per recoverable failure class: maximum 2.
- Consecutive NO_PROGRESS: maximum 1 before blocking on the next occurrence.
- Pilot total automatic retries: maximum 3.
- No blind retry of missing approvals, missing assets, permission/credential failures, destructive schema changes, or unclear requirements.

## Monitor role

Existing Health Build, Deployment and QA monitors are observers only during the pilot.
They may inspect, verify and report evidence or suspected blockers.
They must not create new monitors, create implementation tasks independently, mark the Goal COMPLETE, or become an alternative state authority.

## Live-control preflight

Before depending on any control in autonomous continuation, verify and record:

- `CLAUDE_AUTOMATION_ENABLED` state, or UNKNOWN.
- authoritative dispatcher workflow and triggers.
- required secret names/availability without exposing values.
- current Vercel Health project / production URL / preview behaviour.
- current main SHA and current pilot PR state.
- monitor permissions and exact write destination.
- whether local automation is included or excluded.

UNKNOWN facts are not valid dependencies for autonomous continuation.

## Owner escalation

Escalate only for genuine owner decisions, paid services, credentials/account ownership, missing approved assets, destructive migrations, production DNS/domain changes, publishing/capturing/refunding/fulfilment actions, or other irreversible decisions.

Every escalation must state:

- BLOCKER
- CAUSE
- WHAT IS ALREADY COMPLETE
- EXACT OWNER ACTION REQUIRED
- WHAT HAPPENS AFTER

## Pilot

Goal ID: `HEALTH-VISUAL-PILOT-001`

Outcome: integrate one owner-approved real Asclepios product visual into the intended Health page/card, produce correct desktop and mobile presentation, pass build/browser checks, and create a matching Vercel preview with visual evidence.

The owner approves once. The controller, not the owner, owns continuation after each Rex run.
