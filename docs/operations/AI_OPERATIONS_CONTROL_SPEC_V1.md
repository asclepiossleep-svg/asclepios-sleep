# AI Operations Control Specification v1

Status: EXECUTABLE_SPEC
Controller: Amanda only
Implementation source of truth: GitHub
Deterministic enforcement: GitHub Actions
Deployment evidence: Vercel only

## A. AI role map
| Role | Authority | Must not do |
|---|---|---|
| Edmund | Company owner; final approval for product/visual, business/content, privileged/billing/quota and irreversible decisions | Routine technical execution |
| Manus | Consultant / Automation Architect; rule/architecture review and major repeated-failure diagnosis | Act as Goal controller or continuous operator |
| Amanda | Operations Manager / sole Goal-level Execution Controller; defines bounded tasks, reads objective evidence, selects next step, escalates when required | Create a second controller/source of truth |
| Rex / Claude Code | Technical executor of an explicit bounded task | Product approval, Goal completion, self-expanding scope |
| GitHub | Canonical implementation and execution-record source | — |
| GitHub Actions | Deterministic checks/enforcement | Decide product approval |
| Vercel | Deployment evidence | Substitute for CI, asset, or visual evidence |

## B. Task contract
Every task MUST define:
```yaml
task_id: string
goal_id: string
owner: Amanda|Rex|Edmund|Manus
input_refs: [commit/file/asset/run/decision refs]
scope: one bounded action
output: exact expected artifact/evidence
success_criteria: objectively testable conditions
stop_conditions: blocker or no-progress conditions
```
No artifact = no progress. CI green alone != Goal complete.

## C. Standard Rex handoff schema
```yaml
task_id:
goal_id:
commit_sha:
files_changed: []
asset_sha256: []        # empty if N/A
ci_run_id:              # null if N/A
deployment_id:          # null if N/A
deployment_url:         # null if N/A
current_state:
blocker_code: NONE
next_action:
```
Claims without the referenced evidence do not advance state.

## D. Top-level state model
`QUEUED -> ACTIVE -> CODE_DONE -> MERGED -> DEPLOYED -> VERIFIED -> COMPLETE`

Side states: `BLOCKED`, `RECOVERING`, `OWNER_REVIEW`.

Rules:
- CODE_DONE requires an exact commit.
- MERGED requires that commit/change in canonical GitHub lineage.
- DEPLOYED requires deployment evidence tied to the intended commit where observable.
- VERIFIED requires required CI plus applicable exact asset hashes and desktop/mobile visual evidence.
- COMPLETE is set only by Amanda after all Goal acceptance criteria are evidenced; product/visual approval remains Edmund's authority when required.
- Any stale/missing evidence keeps the highest proven prior state.

## E. Blocker taxonomy
| Code | Meaning |
|---|---|
| NONE | No blocker |
| ASSET_MISSING | Required exact approved bytes unavailable |
| ASSET_HASH_MISMATCH | Asset bytes do not match approved SHA-256 |
| CI_STARTUP | Workflow dispatched but cannot create/run expected jobs |
| CI_FAILURE | Jobs ran and deterministic check failed |
| PERMISSION | Required account/repo permission unavailable |
| SECRET_CONFIG | Required secret/config unavailable or invalid |
| QUOTA_BILLING | Provider quota/billing blocks execution |
| DEPLOYMENT | Intended commit not deployed / deployment failed |
| VISUAL_MISMATCH | Desktop/mobile evidence does not match approved target |
| OWNER_DECISION | Product/visual/business/content/irreversible intent required |
| EXTERNAL_TRANSIENT | External service failure with changed/retryable evidence |
| NO_PROGRESS | Two attempts produced no material evidence change |

## F. Retry / no-progress rules
- Retry only when input/evidence changed or a diagnosed transient condition justifies one bounded retry.
- Track attempt fingerprint: `commit_sha + relevant file/asset SHA + ci diagnosis + blocker_code`.
- If two executions leave commit SHA, file/asset SHA, CI diagnosis and blocker unchanged: set `NO_PROGRESS`; stop Rex.
- Never rerun unchanged zero-job workflows; diagnose startup first.
- Never repeatedly monitor unchanged state.
- A retry must state what changed since the previous attempt.

## G. Edmund escalation rules
Escalate only for:
1. visual/product approval;
2. business/content decision;
3. permissions, billing, quota, secrets/account action, or irreversible operation unavailable to Amanda/Rex;
4. evidence cannot determine owner intent.
Escalation MUST contain the minimum decision/action required and objective evidence. Otherwise Amanda chooses the next bounded technical step.

## H. Canonical execution record
One record per task, stored/referenced in GitHub:
```yaml
record_version: 1
task_id:
goal_id:
controller: Amanda
executor:
input_refs: []
commit_sha:
files_changed: []
asset_sha256: []
ci_run_id:
deployment_id:
deployment_url:
desktop_evidence:
mobile_evidence:
current_state:
blocker_code:
attempt_fingerprint:
attempt_number:
evidence_refs: []
next_action:
updated_at:
```
GitHub is canonical. Comments/reports may point to this record but never replace objective artifacts/runs/commits.

## I. Simple dashboard/status format
```text
GOAL <goal_id> | <current_state>
Task: <task_id> | Owner: <owner/executor>
Code: <commit_sha or —> | CI: <run/result or —> | Deploy: <id/url/result or —>
Assets: <verified/N-A/blocker> | Desktop/Mobile: <verified/pending/N-A>
Blocker: <code or NONE>
Next: <one bounded action>
Edmund: <NOT_REQUIRED or exact decision/action>
```

## Operating invariant
Amanda is the single Goal-level controller. This specification adds no second monitor, orchestrator, source of truth, replacement role, or reusable skill. It is intentionally minimal and should be changed only after observed execution evidence shows a need.
