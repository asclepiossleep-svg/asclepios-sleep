// Pure, dependency-free logic for the production verification gate
// (docs/company/PRODUCTION_VERIFICATION_GATE_V1.md). Kept separate from
// scripts/ci/verify-production-evidence.mjs (which needs Playwright/network)
// and scripts/verify-deployment.mjs (which needs the GitHub Actions runtime)
// so the decision rules themselves can be unit-tested in isolation with
// node:test — see scripts/ci/production-evidence-lib.test.mjs.

export const CANONICAL_HEALTH_URL = "https://asclepios-health.vercel.app/";

const SHA_PATTERN = /^[0-9a-f]{7,40}$/;

// Exact HTTPS origin + path match against the canonical Health production
// URL — not a hostname-only substring check. Trailing slash on an empty
// path is the only normalization allowed; a different scheme, host, path,
// query, hash, port or a hostname that merely contains the canonical host
// as a substring must all be rejected.
export function isCanonicalHealthUrl(candidate) {
  if (typeof candidate !== "string" || candidate.trim() === "") return false;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  const canonical = new URL(CANONICAL_HEALTH_URL);
  return (
    url.protocol === canonical.protocol &&
    url.hostname === canonical.hostname &&
    (url.port || "") === (canonical.port || "") &&
    (url.pathname === canonical.pathname || (url.pathname === "" && canonical.pathname === "/")) &&
    url.search === "" &&
    url.hash === ""
  );
}

export function isRateLimitShaped(status, text) {
  if (status === 429) return true;
  return typeof text === "string" && /rate.?limit/i.test(text);
}

// Lowercases and validates shape; returns null for anything that isn't a
// real, bindable commit SHA (missing, empty, "unknown", or malformed).
export function normalizeSha(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "unknown") return null;
  if (!SHA_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export const ShaComparison = Object.freeze({
  NOT_REQUIRED: "NOT_REQUIRED",
  MATCH: "MATCH",
  MISMATCH: "MISMATCH",
  DEPLOYED_UNKNOWN: "DEPLOYED_UNKNOWN",
});

// Safely compares a deployed SHA (read from the page's own meta tag) against
// an expected SHA bound to a validated deployment payload. Handles a
// full-vs-short SHA on either side by prefix comparison, but only once both
// values are confirmed to be well-formed hex of at least 7 characters —
// never a loose/partial string match. A deployed value that is missing or
// "unknown" is never treated as a match, even when it happens to equal the
// literal string "unknown" case-insensitively.
export function compareShas(deployedRaw, expectedRaw) {
  const expected = normalizeSha(expectedRaw);
  if (!expected) return ShaComparison.NOT_REQUIRED;

  const deployed = normalizeSha(deployedRaw);
  if (!deployed) return ShaComparison.DEPLOYED_UNKNOWN;

  const [shorter, longer] = deployed.length <= expected.length ? [deployed, expected] : [expected, deployed];
  return longer.startsWith(shorter) ? ShaComparison.MATCH : ShaComparison.MISMATCH;
}

// Visible-content-only marker check: a marker present only in raw HTML
// (a hidden node, an attribute, a <script>/<style> block, a comment) must
// not count as present. Only the rendered page's visible text does.
export function matchVisibleMarkers(visibleText, markers) {
  const text = typeof visibleText === "string" ? visibleText : "";
  const missing = markers.filter((marker) => !text.includes(marker));
  const matched = markers.filter((marker) => !missing.includes(marker));
  return { matched, missing };
}

export const VerificationState = Object.freeze({
  LIVE_COMPLETE: "LIVE_COMPLETE",
  STALE_OR_WRONG: "STALE_OR_WRONG",
  UNREACHABLE: "UNREACHABLE",
  RATE_LIMIT_BLOCKED: "RATE_LIMIT_BLOCKED",
});

// Decides the final state for a single successfully-fetched page. Any
// missing marker, a SHA mismatch, or a deployed SHA that is missing/unknown
// while an expected SHA was required all resolve to STALE_OR_WRONG — never
// LIVE_COMPLETE. Only an exact marker match plus a SHA comparison of MATCH
// or NOT_REQUIRED can produce LIVE_COMPLETE.
export function decideState({ missingMarkersCount, shaComparison }) {
  if (missingMarkersCount > 0) return VerificationState.STALE_OR_WRONG;
  if (shaComparison === ShaComparison.MISMATCH || shaComparison === ShaComparison.DEPLOYED_UNKNOWN) {
    return VerificationState.STALE_OR_WRONG;
  }
  return VerificationState.LIVE_COMPLETE;
}

// Reads the commit SHA bound to a real GitHub deployment_status (or
// deployment) event payload — never an unrelated Actions checkout SHA. A
// workflow_dispatch (or any event lacking a deployment payload) yields ''
// (NOT_PROVIDED), which is a legitimate, non-binding case: SHA verification
// is only required when a validated deployment input actually supplies one.
export function extractDeploymentShaFromEvent(event) {
  if (!event || typeof event !== "object") return "";
  const sha = event.deployment_status?.sha ?? event.deployment?.sha ?? "";
  return typeof sha === "string" ? sha : "";
}
