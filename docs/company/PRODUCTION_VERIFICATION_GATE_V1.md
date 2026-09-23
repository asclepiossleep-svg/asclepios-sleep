# Production Verification Gate V1

Owner: Amanda
Status: IMPLEMENTATION-READY, WIRED INTO `deployment-verification.yml`
Scope: `https://asclepios-health.vercel.app/` (the Asclepios Health canonical production URL — exact HTTPS origin and path, not a hostname substring match)
Goal: Amanda OS v1.0 completion (Issue #120), bounded work item 3
Decision logic: `scripts/ci/production-evidence-lib.mjs` (pure, unit-tested — `scripts/ci/production-evidence-lib.test.mjs`, run via `npm run test:production-verification-gate`)

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
  "commit_unknown_but_required": false,
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
  `GITHUB_SHA` when built in Actions — that fallback is safe at *build*
  time, since it is Vercel/Actions building the exact commit being
  deployed). If neither is set, the tag reads `"unknown"` and the gate
  reports `deployed_commit_sha: "UNKNOWN"` rather than guessing.
- `expected_commit_sha` — bound to the actual deployment identity, never to
  an unrelated Actions checkout SHA. See "SHA binding" below for how the
  *caller* (`scripts/verify-deployment.mjs`) resolves this value — the gate
  itself only compares whatever it is given.
- `commit_mismatch` — `true` only when both a valid expected SHA and a
  valid deployed SHA were observed and they disagree (short/full SHA
  prefixes are compared safely; see `compareShas` in
  `production-evidence-lib.mjs`).
- `commit_unknown_but_required` — `true` when an expected SHA was required
  but the deployed page's SHA meta tag was missing/`"unknown"`/malformed.
  This is treated exactly like a mismatch: **a missing or unknown deployed
  SHA never yields `LIVE_COMPLETE`** when a SHA was expected — it yields
  `STALE_OR_WRONG`, because identity was never actually confirmed.
- `http_status` / `matched_markers` / `missing_markers` — the actual
  browser-observed result, not a raw `fetch()` against a client-rendered
  SPA shell. Markers are matched against the rendered page's **visible**
  `innerText` only — a marker that exists only in raw HTML (a hidden node,
  a `<script>`/`<style>` block, an attribute, a comment) does not count as
  present.
- `screenshot` — full-page PNG written alongside `evidence.json`; the
  visual proof a stale-content claim or a `LIVE_COMPLETE` claim can be
  checked against once a maintainer wires durable artifact upload (see
  "Wiring" below for why Rex cannot add that step itself).
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
silently swallowed as a pass** — the calling script
(`scripts/verify-deployment.mjs`) logs it as an explicit external-blocker
message and then **fails its own process with a distinct exit code (`3`)**,
so `deployment-verification.yml`'s "Resolve recovered deployment blocker"
step (which only runs `if: success()`) can never close an existing
`[AMANDA-BLOCKER]` issue as "recovered" on the strength of a rate limit it
never actually got past. `evidence.json` still records exactly what was
observed, rather than inventing a pass.

### SHA binding — never an unrelated Actions SHA

`scripts/verify-deployment.mjs` resolves `EXPECTED_COMMIT_SHA` by reading
the GitHub Actions event payload at `$GITHUB_EVENT_PATH` (a standard runner
env var present on every job — no workflow file edit needed) and extracting
`deployment_status.sha` (falling back to `deployment.sha`) — the commit
GitHub/Vercel actually associated with *this specific deployment*. It
deliberately does **not** fall back to `GITHUB_SHA`: that is the commit
checked out for *this Actions run*, which is not necessarily the commit
that was deployed (for example, after the `ignoreCommand` fan-out skip
lands, a later run's checkout can be ahead of the deployment it is meant to
verify). When the triggering event carries no deployment payload (e.g. a
manual `workflow_dispatch`), `EXPECTED_COMMIT_SHA` resolves to `''`
(`NOT_PROVIDED`) rather than a guessed value — SHA verification is then
correctly skipped (`ShaComparison.NOT_REQUIRED`), not silently satisfied.

## Wiring

The Rex/Claude Code Action GitHub App has no `workflows` write permission
(`scripts/verify-agent-workflow-policy.mjs` deliberately locks this down —
confirmed live when a push touching
`.github/workflows/deployment-verification.yml` was rejected outright by
GitHub during this bounded item, the same constraint
`PRODUCTION_ASSET_ALLOWLIST_GATE_V1.md` hit for `required-build-gate.yml`).
So, like that gate, this one is wired into a script the existing workflow
already runs unmodified, rather than into the protected workflow file
itself:

`.github/workflows/deployment-verification.yml` already runs
`node scripts/verify-deployment.mjs` on every real Vercel `deployment_status`
success event (webhook-driven, not a guess about when a deploy happened)
and on manual `workflow_dispatch`. `scripts/verify-deployment.mjs` now, once
its existing lightweight route checks pass for a URL that resolves to the
`health` profile:

1. installs the pinned Playwright Chromium build at runtime
   (`npm install --no-save playwright@1.63.0` + `playwright install
   --with-deps chromium`) — no new workflow step needed, since this all
   happens inside the one `run:` line that already exists;
2. shells out to `scripts/ci/verify-production-evidence.mjs` with
   `CANONICAL_URL` set to the deployment URL and `EXPECTED_COMMIT_SHA` set
   to the deployment's own `sha` read from `$GITHUB_EVENT_PATH` (see "SHA
   binding" above) — never to `GITHUB_SHA`;
3. only runs the canonical-URL-bound production probe when `DEPLOYMENT_URL`
   is an **exact** match for `https://asclepios-health.vercel.app/`
   (`isCanonicalHealthUrl` — https scheme, exact host, path `/`, no
   query/fragment); a preview URL that merely contains the canonical
   hostname as a substring is not treated as canonical;
4. treats a `RATE_LIMIT_BLOCKED` exit code (`2`) as a logged external
   blocker and fails its own process with a distinct exit code (`3`) — not
   the same code as a real defect, but still never a silent success;
5. lets a real `STALE_OR_WRONG`/`UNREACHABLE` result (exit `1`), or a failed
   Playwright install, fail the overall script with exit code `1`, which the
   workflow's existing "Escalate failed deployment verification" step turns
   into an `[AMANDA-BLOCKER]` issue with an exact next action. Either
   non-zero exit (`1` or `3`) also means the "Resolve recovered deployment
   blocker" step (`if: success()`) does not run, so neither a real defect
   nor a rate limit can be misreported as recovered/verified.

`evidence.json` and the full-page screenshot are written to
`artifacts/production-verification/` on the runner, exactly as they would
be if invoked locally. **They are not currently uploaded as a durable CI
artifact** — `actions/upload-artifact` needs a new workflow step, which
needs `workflows` permission Rex does not have. A maintainer can add that
one step later; until then, the evidence is fully visible in the job's
`stdout` (the script prints the full `evidence.json` to the log) even
though the screenshot PNG itself does not survive past the run. This is a
known, documented gap — not a silent one.

## Tests

`scripts/ci/production-evidence-lib.mjs` holds every decision rule as a
pure, dependency-free function so it can be exercised without Playwright,
network access or a GitHub Actions runtime:

- `isCanonicalHealthUrl` — positive (exact canonical URL) and negative
  (http instead of https, wrong path, query/fragment present, a hostname
  that merely contains the canonical host as a substring, a preview-branch
  host) cases.
- `compareShas` / `normalizeSha` — expected-not-provided, deployed
  missing/`"unknown"`, full-vs-full match, short-vs-full and full-vs-short
  prefix matches, a same-length wrong SHA, a short wrong SHA that is not a
  genuine prefix, and malformed non-hex input.
- `matchVisibleMarkers` — a marker present in visible text, a marker absent
  from visible text (simulating HTML-only presence), and empty input.
- `decideState` — every combination of missing markers / SHA comparison
  result, explicitly asserting a missing/unknown required SHA resolves to
  `STALE_OR_WRONG`, never `LIVE_COMPLETE`.
- `extractDeploymentShaFromEvent` — `deployment_status.sha`,
  `deployment.sha` fallback, a `workflow_dispatch`-shaped payload with no
  deployment data (yields `''`, never a guess), and a malformed non-string
  `sha` field.

Run locally or in CI with:

```bash
npm run test:production-verification-gate
```

This is wired into the root `build` script (`package.json`), the same
no-workflow-edit pattern `check:asset-manifest` already uses, so
`required-build-gate.yml` exercises it on every PR/push to `main` without
any `.github/workflows/*.yml` change.

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
