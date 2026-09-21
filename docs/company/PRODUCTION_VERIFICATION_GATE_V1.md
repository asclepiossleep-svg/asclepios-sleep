# Production Verification Gate V1

Owner: Amanda
Status: IMPLEMENTATION-READY, WIRED INTO `deployment-verification.yml`
Scope: `https://asclepios-health.vercel.app/` (the Asclepios Health canonical production URL)
Goal: Amanda OS v1.0 completion (Issue #120), bounded work item 3

## Purpose

A page, schema or component is not operational merely because it exists in
the repository or because CI is green (`docs/sum/00_SUM_OPERATING_ECOSYSTEM.md`
§1, `docs/sum/06_EXECUTION_STATE_MACHINE.md`). For a deployed public surface,
"green checks" and "merged to `main`" are necessary but not sufficient —
the only thing that proves the surface is actually serving current, correct
content is a fresh, real probe of the canonical production URL itself.

This gate makes that probe deterministic, evidence-producing, and honest
about external blockers (Vercel build-rate limiting) instead of treating a
provider rate limit as either a pass or a defect.

## The three states a Rex handoff must distinguish

| State | Meaning | Who can claim it |
|---|---|---|
| `CODE_DONE` | The implementation exists, builds, and passes required checks on a branch/PR. Not yet on `main`. | Any Rex handoff, at any time. |
| `MERGED` | The PR has been merged to `main` by a human reviewer. `main`'s required checks are green for that commit. | Only after an owner/maintainer merge — Rex never merges its own PR. |
| `LIVE_COMPLETE` | `scripts/ci/verify-production-evidence.mjs` has produced an `evidence.json` with `state: "LIVE_COMPLETE"` for the canonical URL, whose `deployed_commit_sha` is consistent with (or not older than) the commit being claimed complete, within the run's freshness window. | Only the gate itself, via real evidence — never a Rex self-report. |

**A deployed-surface goal must never be reported `Recommended Goal State:
COMPLETE` on the strength of `CODE_DONE` or `MERGED` alone.** `MERGED`
proves the change is on `main`; it does not prove `main` is what
`https://asclepios-health.vercel.app/` is currently serving — Vercel
build-rate exhaustion has repeatedly caused exactly that gap during this
Goal's own history (PRs #121–#123).

Stale or wrong production content is `BLOCKED`, not `COMPLETE`: report the
`evidence.json` `state` (`STALE_OR_WRONG`), the missing markers or commit
mismatch it recorded, and the exact next action (redeploy, or wait out the
Vercel rate-limit window and re-run the gate).

## The evidence

`scripts/ci/verify-production-evidence.mjs` probes one canonical URL with a
real headless browser (Playwright/Chromium, already pinned to `1.63.0`
elsewhere in this repo — see `tests/health-browser-smoke.mjs`) and writes
`artifacts/production-verification/evidence.json`:

```json
{
  "canonical_url": "https://asclepios-health.vercel.app/",
  "timestamp": "2026-09-21T12:00:00.000Z",
  "http_status": 200,
  "expected_markers": ["Asclepios Health", "Better Health.", "Explore Products"],
  "matched_markers": ["Asclepios Health", "Better Health.", "Explore Products"],
  "missing_markers": [],
  "deployed_commit_sha": "fb43dbe20b973eb7f63b4cc16c14e94449f7ba52",
  "expected_commit_sha": "fb43dbe20b973eb7f63b4cc16c14e94449f7ba52",
  "commit_mismatch": false,
  "screenshot": "artifacts/production-verification/production-home.png",
  "state": "LIVE_COMPLETE"
}
```

Fields, and why each exists:

- `canonical_url` — the exact URL probed. Never assumed; always logged.
- `timestamp` — freshness. An old `evidence.json` does not prove current
  health (`docs/sum/06_EXECUTION_STATE_MACHINE.md` "Freshness rule").
- `expected_markers` — real, current visible copy pulled from
  `apps/health-web/src/i18n/en.json` (`health.hero.title.line1`,
  `health.hero.cta.products`) and the static `<title>` in
  `apps/health-web/index.html`. Never invented placeholder text.
- `deployed_commit_sha` — read from a `<meta name="asclepios-commit-sha">`
  tag injected at build time by `apps/health-web/vite.config.ts`, sourced
  from Vercel's own `VERCEL_GIT_COMMIT_SHA` build environment variable (or
  `GITHUB_SHA` when built in Actions). If neither is set, the tag reads
  `"unknown"` and the gate reports `deployed_commit_sha: "UNKNOWN"` rather
  than guessing.
- `http_status` / `matched_markers` / `missing_markers` — the actual
  browser-observed result, not a raw `fetch()` against a client-rendered
  SPA shell.
- `screenshot` — full-page PNG, uploaded as a CI artifact; the visual proof
  a stale-content claim or a `LIVE_COMPLETE` claim can be checked against.
- `state` — one of `LIVE_COMPLETE`, `STALE_OR_WRONG`, `UNREACHABLE`,
  `RATE_LIMIT_BLOCKED` (see below).

### Retry/backoff and the rate-limit distinction

Per `docs/sum/07_FAILURE_RECOVERY_RUNBOOK.md`, retries are bounded and
never infinite. The gate retries up to `VERIFY_ATTEMPTS` times (default 5)
with linearly increasing backoff (`VERIFY_BASE_DELAY_MS` × attempt number).
A response classified as rate-limit-shaped (HTTP 429, or a body/HTML
containing "rate limit") that survives every attempt produces
`state: "RATE_LIMIT_BLOCKED"` and exit code `2` — distinct from
`UNREACHABLE` (exit `1`, a real defect) and from `LIVE_COMPLETE` (exit `0`).
**`RATE_LIMIT_BLOCKED` is never treated as proof of success, and never
silently swallowed as a generic failure** — the calling workflow step
reports it as an explicit external-blocker warning and still uploads
whatever partial evidence it captured, rather than inventing a pass.

## Wiring

`.github/workflows/deployment-verification.yml` already runs on every real
Vercel `deployment_status` success event (webhook-driven, not a guess about
when a deploy happened) and on manual `workflow_dispatch`. For a deployment
whose URL resolves to the `health` profile, it now additionally:

1. installs the pinned Playwright Chromium build;
2. runs `scripts/ci/verify-production-evidence.mjs` with
   `EXPECTED_COMMIT_SHA` set to the triggering commit's SHA;
3. converts a `RATE_LIMIT_BLOCKED` exit code (`2`) into a step warning
   without failing the job (an external blocker is not a verification
   defect) while still uploading the evidence/screenshot;
4. lets a real `STALE_OR_WRONG`/`UNREACHABLE` result (exit `1`) fail the
   job, which the workflow's existing "Escalate failed deployment
   verification" step turns into an `[AMANDA-BLOCKER]` issue with an exact
   next action;
5. uploads `artifacts/production-verification/` as a build artifact on
   every run (`if: always()`), so evidence exists whether the probe passed,
   failed, or was rate-limited.

## Manual / on-demand use

```bash
CANONICAL_URL=https://asclepios-health.vercel.app/ \
EXPECTED_COMMIT_SHA=<commit-to-check-against, optional> \
node scripts/ci/verify-production-evidence.mjs
```

Or dispatch the workflow directly against any URL/profile without waiting
for a deployment event:

```bash
gh workflow run deployment-verification.yml \
  -f deployment_url=https://asclepios-health.vercel.app/ \
  -f verification_profile=health
```

## Known gap (not closed by this bounded item)

`.github/workflows/amanda-goal-controller.yml`'s `COMPLETE` branch
currently re-verifies GitHub's required-check rollup independently of the
Rex handoff's self-reported `Checks` field (it does not trust that field —
see its own comment), but it does **not** independently re-probe production
before accepting `Recommended Goal State: COMPLETE`. Closing that gap needs
either a repo convention for marking a Goal Issue as "deployed-surface" (so
the controller knows when to demand `LIVE_COMPLETE` evidence) or a new
required handoff field the controller can check the way it checks `Goal
ID:` today. Flagged for a future bounded item rather than done speculatively
here, to avoid repeating the earlier missing-`Goal ID:` BLOCKED cycle this
Goal already hit once.
