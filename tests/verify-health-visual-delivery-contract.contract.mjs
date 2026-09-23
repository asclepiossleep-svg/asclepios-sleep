// Direct positive/negative contract tests for scripts/ci/verify-health-visual-delivery-contract.mjs
// -- the exact-SHA/PR-binding gate that health-visual-delivery-gate.yml is meant to call once
// workflow-YAML wiring lands (see the Goal Issue #114 handoff for that permission-gated step).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(repoRoot, 'scripts/ci/verify-health-visual-delivery-contract.mjs');
const APPROVAL = 'https://github.com/asclepiossleep-svg/asclepios-sleep/issues/114#issuecomment-0000000000';

const HEAD_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);
const PR_NUMBER = 116;
const PR_URL = 'https://github.com/asclepiossleep-svg/asclepios-sleep/pull/116';

function writeFile(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeJson(root, rel, obj) {
  writeFile(root, rel, `${JSON.stringify(obj, null, 2)}\n`);
}

function freshRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'health-visual-delivery-'));
}

function baseManifest(version, overrides = {}) {
  return {
    schema_version: '1.2.0',
    goal_id: 'HEALTH-VISUAL-PILOT-001',
    page: 'home',
    version,
    status: 'VERIFYING',
    owner_approval: { status: 'APPROVED', approval_record: APPROVAL },
    delivery_evidence: {
      commit_sha: HEAD_SHA,
      pr_number: PR_NUMBER,
      pr_url: PR_URL,
    },
    ...overrides,
  };
}

function writeV1Manifest(root, overrides = {}) {
  writeJson(root, 'apps/health-web/src/assets/pages/home/v1/manifest.json', baseManifest('v1', overrides));
}

function writeV2Manifest(root, overrides = {}) {
  writeJson(root, 'apps/health-web/src/assets/pages/home/v2/manifest.json', {
    ...baseManifest('v2', overrides),
    activation: { production_active: true, ...(overrides.activation || {}) },
  });
}

function run(root, env = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PR_HEAD_SHA: HEAD_SHA, PR_NUMBER: String(PR_NUMBER), PR_URL, ...env },
  });
}

let passed = 0;
let failedCount = 0;
function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failedCount++;
    console.error(`FAIL: ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

// 1. v1 fallback (no v2 manifest) with matching evidence passes.
{
  const root = freshRoot();
  writeV1Manifest(root);
  const result = run(root);
  check('v1 fallback with matching evidence passes', result.status === 0 && /HEALTH_VISUAL_SHA_BINDING_PASS/.test(result.stdout) && /home\/v1\/manifest\.json/.test(result.stdout), result.stdout + result.stderr);
  cleanup(root);
}

// 2. Active v2 (activation.production_active === true) is selected and validated instead of v1.
{
  const root = freshRoot();
  writeV1Manifest(root, { status: 'BLOCKED', delivery_evidence: { commit_sha: OTHER_SHA, pr_number: 999, pr_url: 'https://example.invalid/wrong' } });
  writeV2Manifest(root);
  const result = run(root);
  check('active v2 selection passes and ignores stale v1 evidence', result.status === 0 && /home\/v2\/manifest\.json/.test(result.stdout), result.stdout + result.stderr);
  cleanup(root);
}

// 3. Missing manifest (neither v1 nor v2) fails cleanly.
{
  const root = freshRoot();
  const result = run(root);
  check('missing manifest fails', result.status !== 0 && /is missing/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 4. Malformed manifest JSON fails cleanly instead of crashing with a raw stack trace.
{
  const root = freshRoot();
  writeFile(root, 'apps/health-web/src/assets/pages/home/v1/manifest.json', '{ not valid json');
  const result = run(root);
  check('malformed manifest fails cleanly', result.status !== 0 && /is not valid JSON/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 5. Stale commit SHA (manifest's recorded commit no longer matches the PR head) fails.
{
  const root = freshRoot();
  writeV1Manifest(root, { delivery_evidence: { commit_sha: OTHER_SHA, pr_number: PR_NUMBER, pr_url: PR_URL } });
  const result = run(root);
  check('stale commit SHA fails', result.status !== 0 && /manifest commit .* != PR head/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 6. Wrong PR number fails.
{
  const root = freshRoot();
  writeV1Manifest(root, { delivery_evidence: { commit_sha: HEAD_SHA, pr_number: 1, pr_url: PR_URL } });
  const result = run(root);
  check('wrong PR number fails', result.status !== 0 && /manifest PR number mismatch/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 7. Wrong PR URL fails.
{
  const root = freshRoot();
  writeV1Manifest(root, { delivery_evidence: { commit_sha: HEAD_SHA, pr_number: PR_NUMBER, pr_url: 'https://example.invalid/not-the-pr' } });
  const result = run(root);
  check('wrong PR URL fails', result.status !== 0 && /manifest PR URL mismatch/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 8. Invalid lifecycle status (not VERIFYING/COMPLETE) fails as not delivery-eligible.
{
  const root = freshRoot();
  writeV1Manifest(root, { status: 'BLOCKED' });
  const result = run(root);
  check('invalid lifecycle status fails', result.status !== 0 && /is not delivery-eligible/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

console.log(`\nverify-health-visual-delivery-contract.contract: ${passed} passed, ${failedCount} failed`);
if (failedCount) process.exit(1);
