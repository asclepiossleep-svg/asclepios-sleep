// Deterministic production evidence gate for a single canonical URL.
//
// Distinguishes, with real evidence rather than assumption:
//   LIVE_COMPLETE      — reachable, all expected markers visibly present, and
//                        (when a validated expected commit SHA was supplied)
//                        the deployed page's commit-SHA meta tag matches it.
//   STALE_OR_WRONG     — reachable but missing expected visible markers, or
//                        serving a different/unknown commit while a commit
//                        was required. A real defect — never LIVE_COMPLETE.
//   UNREACHABLE        — did not respond successfully after bounded retries,
//                        for a reason other than a provider rate limit.
//   RATE_LIMIT_BLOCKED — bounded retries were exhausted against a rate-limit
//                        shaped response. This is an external deployment
//                        blocker: never proof of success, and never silently
//                        swallowed as a pass by the caller.
//
// See docs/company/PRODUCTION_VERIFICATION_GATE_V1.md for the CODE_DONE /
// MERGED / LIVE_COMPLETE contract this script exists to satisfy.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import {
  CANONICAL_HEALTH_URL,
  ShaComparison,
  VerificationState,
  compareShas,
  decideState,
  isRateLimitShaped,
  matchVisibleMarkers,
} from "./production-evidence-lib.mjs";

const CANONICAL_URL = process.env.CANONICAL_URL || CANONICAL_HEALTH_URL;
const EXPECTED_COMMIT_SHA = process.env.EXPECTED_COMMIT_SHA || "";
const EXPECTED_MARKERS = (process.env.EXPECTED_MARKERS || "Asclepios Health|Better Health.|Explore Products")
  .split("|")
  .map((marker) => marker.trim())
  .filter(Boolean);
const ATTEMPTS = Number(process.env.VERIFY_ATTEMPTS || 5);
const BASE_DELAY_MS = Number(process.env.VERIFY_BASE_DELAY_MS || 5000);
const EVIDENCE_DIR = process.env.EVIDENCE_DIR || "artifacts/production-verification";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCommitSha(html) {
  const match = html.match(/<meta[^>]+name="asclepios-commit-sha"[^>]+content="([0-9a-f]{7,40}|unknown)"/i);
  return match ? match[1] : "UNKNOWN";
}

await fs.mkdir(EVIDENCE_DIR, { recursive: true });

let result = null;
let lastFailureKind = VerificationState.UNREACHABLE;
let lastFailureDetail = "exhausted retries with no successful attempt";

const browser = await chromium.launch();
try {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const response = await page.goto(CANONICAL_URL, { waitUntil: "networkidle", timeout: 30_000 });
      const status = response ? response.status() : 0;
      const html = await page.content();
      const bodyText = await page
        .locator("body")
        .innerText()
        .catch(() => "");

      if (!response || !response.ok()) {
        const rateLimited = isRateLimitShaped(status, bodyText) || isRateLimitShaped(status, html);
        lastFailureKind = rateLimited ? VerificationState.RATE_LIMIT_BLOCKED : VerificationState.UNREACHABLE;
        lastFailureDetail = `HTTP ${status}`;
        throw new Error(lastFailureDetail);
      }

      const deployedCommitSha = extractCommitSha(html);
      // Visible-content-only: matched against the rendered body's innerText,
      // never against raw HTML (a marker hidden in a <script>, a comment or
      // an attribute must not count as present).
      const { matched: matchedMarkers, missing: missingMarkers } = matchVisibleMarkers(bodyText, EXPECTED_MARKERS);

      const screenshotPath = `${EVIDENCE_DIR}/production-home.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const shaComparison = compareShas(deployedCommitSha, EXPECTED_COMMIT_SHA);
      const commitMismatch = shaComparison === ShaComparison.MISMATCH;
      // A missing/unknown deployed SHA while an expected SHA was required is
      // never proof of identity — decideState treats it the same as a real
      // mismatch (STALE_OR_WRONG), not LIVE_COMPLETE.
      const commitUnknownButRequired = shaComparison === ShaComparison.DEPLOYED_UNKNOWN;

      const state = decideState({ missingMarkersCount: missingMarkers.length, shaComparison });

      result = {
        canonical_url: CANONICAL_URL,
        timestamp: new Date().toISOString(),
        http_status: status,
        attempt,
        attempts_allowed: ATTEMPTS,
        expected_markers: EXPECTED_MARKERS,
        matched_markers: matchedMarkers,
        missing_markers: missingMarkers,
        deployed_commit_sha: deployedCommitSha,
        expected_commit_sha: EXPECTED_COMMIT_SHA || "NOT_PROVIDED",
        commit_mismatch: commitMismatch,
        commit_unknown_but_required: commitUnknownButRequired,
        screenshot: screenshotPath,
        state,
      };

      await context.close();
      break;
    } catch (error) {
      await page
        .screenshot({ path: `${EVIDENCE_DIR}/attempt-${attempt}-failure.png`, fullPage: true })
        .catch(() => {});
      await context.close();
      lastFailureDetail = error.message || lastFailureDetail;

      if (attempt < ATTEMPTS) {
        const delay = BASE_DELAY_MS * attempt;
        console.error(
          `Attempt ${attempt}/${ATTEMPTS} failed (${lastFailureKind}): ${lastFailureDetail}. Retrying in ${delay}ms.`,
        );
        await sleep(delay);
      }
    }
  }
} finally {
  await browser.close();
}

if (!result) {
  result = {
    canonical_url: CANONICAL_URL,
    timestamp: new Date().toISOString(),
    http_status: null,
    attempts_allowed: ATTEMPTS,
    expected_markers: EXPECTED_MARKERS,
    matched_markers: [],
    missing_markers: EXPECTED_MARKERS,
    deployed_commit_sha: "UNKNOWN",
    expected_commit_sha: EXPECTED_COMMIT_SHA || "NOT_PROVIDED",
    commit_mismatch: false,
    commit_unknown_but_required: false,
    screenshot: null,
    state: lastFailureKind,
    error: lastFailureDetail,
  };
}

await fs.writeFile(`${EVIDENCE_DIR}/evidence.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

if (result.state === VerificationState.LIVE_COMPLETE) {
  console.log(`LIVE_COMPLETE: ${CANONICAL_URL} verified at commit ${result.deployed_commit_sha}.`);
  process.exit(0);
} else if (result.state === VerificationState.RATE_LIMIT_BLOCKED) {
  console.error(
    `RATE_LIMIT_BLOCKED: an external provider rate limit prevented verification of ${CANONICAL_URL}. ` +
      "This is an external deployment blocker, not evidence of success or failure.",
  );
  process.exit(2);
} else {
  console.error(
    `${result.state}: ${CANONICAL_URL} did not verify as current production. ` +
      `Missing markers: ${result.missing_markers.join(", ") || "none"}.` +
      (result.commit_mismatch
        ? ` Deployed commit ${result.deployed_commit_sha} does not match expected ${result.expected_commit_sha}.`
        : "") +
      (result.commit_unknown_but_required
        ? ` Deployed commit is ${result.deployed_commit_sha} but expected ${result.expected_commit_sha} was required — an unknown deployed SHA is never accepted as a match.`
        : ""),
  );
  process.exit(1);
}
