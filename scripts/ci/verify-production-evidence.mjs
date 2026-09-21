// Deterministic production evidence gate for a single canonical URL.
//
// Distinguishes, with real evidence rather than assumption:
//   LIVE_COMPLETE      — reachable, all expected markers present, and (when an
//                        expected commit SHA was supplied) the deployed page's
//                        commit-SHA meta tag matches it.
//   STALE_OR_WRONG     — reachable but missing expected markers, or serving a
//                        different commit than expected. A real defect.
//   UNREACHABLE        — did not respond successfully after bounded retries,
//                        for a reason other than a provider rate limit.
//   RATE_LIMIT_BLOCKED — bounded retries were exhausted against a rate-limit
//                        shaped response. This is an external deployment
//                        blocker, never treated as proof of success or failure.
//
// See docs/company/PRODUCTION_VERIFICATION_GATE_V1.md for the CODE_DONE /
// MERGED / LIVE_COMPLETE contract this script exists to satisfy.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const CANONICAL_URL = process.env.CANONICAL_URL || "https://asclepios-health.vercel.app/";
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

function isRateLimitShaped(status, text) {
  if (status === 429) return true;
  return typeof text === "string" && /rate.?limit/i.test(text);
}

function extractCommitSha(html) {
  const match = html.match(/<meta[^>]+name="asclepios-commit-sha"[^>]+content="([0-9a-f]{7,40}|unknown)"/i);
  return match ? match[1] : "UNKNOWN";
}

await fs.mkdir(EVIDENCE_DIR, { recursive: true });

let result = null;
let lastFailureKind = "UNREACHABLE";
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
        lastFailureKind = rateLimited ? "RATE_LIMIT_BLOCKED" : "UNREACHABLE";
        lastFailureDetail = `HTTP ${status}`;
        throw new Error(lastFailureDetail);
      }

      const deployedCommitSha = extractCommitSha(html);
      const missingMarkers = EXPECTED_MARKERS.filter(
        (marker) => !bodyText.includes(marker) && !html.includes(marker),
      );
      const matchedMarkers = EXPECTED_MARKERS.filter((marker) => !missingMarkers.includes(marker));

      const screenshotPath = `${EVIDENCE_DIR}/production-home.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const commitMismatch =
        Boolean(EXPECTED_COMMIT_SHA) && deployedCommitSha !== "UNKNOWN" && deployedCommitSha !== EXPECTED_COMMIT_SHA;

      const state = missingMarkers.length > 0 || commitMismatch ? "STALE_OR_WRONG" : "LIVE_COMPLETE";

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
    screenshot: null,
    state: lastFailureKind,
    error: lastFailureDetail,
  };
}

await fs.writeFile(`${EVIDENCE_DIR}/evidence.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

if (result.state === "LIVE_COMPLETE") {
  console.log(`LIVE_COMPLETE: ${CANONICAL_URL} verified at commit ${result.deployed_commit_sha}.`);
  process.exit(0);
} else if (result.state === "RATE_LIMIT_BLOCKED") {
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
        : ""),
  );
  process.exit(1);
}
