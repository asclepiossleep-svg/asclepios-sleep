import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_HEALTH_URL,
  ShaComparison,
  VerificationState,
  compareShas,
  decideState,
  extractDeploymentShaFromEvent,
  isCanonicalHealthUrl,
  isRateLimitShaped,
  matchVisibleMarkers,
} from "./production-evidence-lib.mjs";

test("isCanonicalHealthUrl: accepts the exact canonical URL", () => {
  assert.equal(isCanonicalHealthUrl(CANONICAL_HEALTH_URL), true);
  assert.equal(isCanonicalHealthUrl("https://asclepios-health.vercel.app/"), true);
});

test("isCanonicalHealthUrl: rejects http (not https)", () => {
  assert.equal(isCanonicalHealthUrl("http://asclepios-health.vercel.app/"), false);
});

test("isCanonicalHealthUrl: rejects a different path", () => {
  assert.equal(isCanonicalHealthUrl("https://asclepios-health.vercel.app/products"), false);
});

test("isCanonicalHealthUrl: rejects a hostname that merely contains the canonical host as a substring", () => {
  assert.equal(isCanonicalHealthUrl("https://not-asclepios-health.vercel.app/"), false);
  assert.equal(isCanonicalHealthUrl("https://asclepios-health.vercel.app.evil.example/"), false);
});

test("isCanonicalHealthUrl: rejects a preview deployment host", () => {
  assert.equal(isCanonicalHealthUrl("https://asclepios-health-git-feature-team.vercel.app/"), false);
});

test("isCanonicalHealthUrl: rejects query strings and fragments", () => {
  assert.equal(isCanonicalHealthUrl("https://asclepios-health.vercel.app/?x=1"), false);
  assert.equal(isCanonicalHealthUrl("https://asclepios-health.vercel.app/#top"), false);
});

test("isCanonicalHealthUrl: rejects malformed input without throwing", () => {
  assert.equal(isCanonicalHealthUrl(""), false);
  assert.equal(isCanonicalHealthUrl("not a url"), false);
  assert.equal(isCanonicalHealthUrl(undefined), false);
});

test("isRateLimitShaped: HTTP 429 is rate-limit shaped", () => {
  assert.equal(isRateLimitShaped(429, ""), true);
});

test("isRateLimitShaped: body text mentioning a rate limit is rate-limit shaped", () => {
  assert.equal(isRateLimitShaped(503, "Deployment rate limited — retry in 24 hours"), true);
  assert.equal(isRateLimitShaped(200, "Rate-Limit exceeded"), true);
});

test("isRateLimitShaped: an ordinary failure is not rate-limit shaped", () => {
  assert.equal(isRateLimitShaped(500, "Internal Server Error"), false);
  assert.equal(isRateLimitShaped(404, "Not Found"), false);
});

test("compareShas: expected not provided is NOT_REQUIRED regardless of deployed value", () => {
  assert.equal(compareShas("abc1234", ""), ShaComparison.NOT_REQUIRED);
  assert.equal(compareShas("unknown", ""), ShaComparison.NOT_REQUIRED);
});

test("compareShas: deployed missing/unknown while expected required is DEPLOYED_UNKNOWN, never a match", () => {
  const expected = "aea52528ad3dc642d74e8407f11ec9df0f7ebb50";
  assert.equal(compareShas("unknown", expected), ShaComparison.DEPLOYED_UNKNOWN);
  assert.equal(compareShas("", expected), ShaComparison.DEPLOYED_UNKNOWN);
  assert.equal(compareShas("UNKNOWN", expected), ShaComparison.DEPLOYED_UNKNOWN);
});

test("compareShas: identical full SHAs match", () => {
  const sha = "aea52528ad3dc642d74e8407f11ec9df0f7ebb50";
  assert.equal(compareShas(sha, sha), ShaComparison.MATCH);
});

test("compareShas: a short deployed SHA that is a true prefix of a full expected SHA matches", () => {
  assert.equal(compareShas("aea5252", "aea52528ad3dc642d74e8407f11ec9df0f7ebb50"), ShaComparison.MATCH);
});

test("compareShas: a short expected SHA that is a true prefix of a full deployed SHA matches", () => {
  assert.equal(compareShas("aea52528ad3dc642d74e8407f11ec9df0f7ebb50", "aea5252"), ShaComparison.MATCH);
});

test("compareShas: a wrong SHA (same length, different value) is a mismatch", () => {
  assert.equal(compareShas("fb43dbe20b973eb7f63b4cc16c14e94449f7ba52", "aea52528ad3dc642d74e8407f11ec9df0f7ebb50"), ShaComparison.MISMATCH);
});

test("compareShas: a wrong short SHA that is not a real prefix is a mismatch, not a coincidental match", () => {
  assert.equal(compareShas("fb43dbe", "aea52528ad3dc642d74e8407f11ec9df0f7ebb50"), ShaComparison.MISMATCH);
});

test("compareShas: malformed non-hex deployed value with a valid expected value is treated as unknown, never a false match", () => {
  assert.equal(compareShas("not-a-sha!!", "aea52528ad3dc642d74e8407f11ec9df0f7ebb50"), ShaComparison.DEPLOYED_UNKNOWN);
});

test("matchVisibleMarkers: a marker present in visible text matches", () => {
  const { matched, missing } = matchVisibleMarkers("Welcome to Asclepios Health. Explore Products now.", [
    "Asclepios Health",
    "Explore Products",
  ]);
  assert.deepEqual(matched, ["Asclepios Health", "Explore Products"]);
  assert.deepEqual(missing, []);
});

test("matchVisibleMarkers: a marker absent from visible text is missing even if it would appear in raw HTML", () => {
  // Simulates a marker only present in a hidden node / meta tag / script,
  // by simply never including it in the rendered "visible text" input —
  // the function must not fall back to any other source.
  const { matched, missing } = matchVisibleMarkers("Welcome to Asclepios Health.", ["Explore Products"]);
  assert.deepEqual(matched, []);
  assert.deepEqual(missing, ["Explore Products"]);
});

test("matchVisibleMarkers: empty/undefined visible text reports every marker missing without throwing", () => {
  const { matched, missing } = matchVisibleMarkers(undefined, ["Asclepios Health"]);
  assert.deepEqual(matched, []);
  assert.deepEqual(missing, ["Asclepios Health"]);
});

test("decideState: all markers present and SHA not required is LIVE_COMPLETE", () => {
  assert.equal(decideState({ missingMarkersCount: 0, shaComparison: ShaComparison.NOT_REQUIRED }), VerificationState.LIVE_COMPLETE);
});

test("decideState: all markers present and SHA matches is LIVE_COMPLETE", () => {
  assert.equal(decideState({ missingMarkersCount: 0, shaComparison: ShaComparison.MATCH }), VerificationState.LIVE_COMPLETE);
});

test("decideState: missing markers is STALE_OR_WRONG even when the SHA matches", () => {
  assert.equal(decideState({ missingMarkersCount: 1, shaComparison: ShaComparison.MATCH }), VerificationState.STALE_OR_WRONG);
});

test("decideState: a SHA mismatch is STALE_OR_WRONG even when all markers are present", () => {
  assert.equal(decideState({ missingMarkersCount: 0, shaComparison: ShaComparison.MISMATCH }), VerificationState.STALE_OR_WRONG);
});

test("decideState: a missing/unknown deployed SHA while one was required is STALE_OR_WRONG, never LIVE_COMPLETE", () => {
  assert.equal(decideState({ missingMarkersCount: 0, shaComparison: ShaComparison.DEPLOYED_UNKNOWN }), VerificationState.STALE_OR_WRONG);
});

test("extractDeploymentShaFromEvent: reads deployment_status.sha when present", () => {
  const event = { deployment_status: { sha: "aea52528ad3dc642d74e8407f11ec9df0f7ebb50" }, deployment: { sha: "different" } };
  assert.equal(extractDeploymentShaFromEvent(event), "aea52528ad3dc642d74e8407f11ec9df0f7ebb50");
});

test("extractDeploymentShaFromEvent: falls back to deployment.sha when deployment_status has none", () => {
  const event = { deployment: { sha: "fb43dbe20b973eb7f63b4cc16c14e94449f7ba52" } };
  assert.equal(extractDeploymentShaFromEvent(event), "fb43dbe20b973eb7f63b4cc16c14e94449f7ba52");
});

test("extractDeploymentShaFromEvent: a workflow_dispatch-shaped payload with no deployment data yields empty (not provided), never invented", () => {
  assert.equal(extractDeploymentShaFromEvent({ inputs: { deployment_url: "https://example.com" } }), "");
  assert.equal(extractDeploymentShaFromEvent(null), "");
  assert.equal(extractDeploymentShaFromEvent(undefined), "");
});

test("extractDeploymentShaFromEvent: a non-string sha field is ignored rather than propagated", () => {
  assert.equal(extractDeploymentShaFromEvent({ deployment_status: { sha: 12345 } }), "");
});
