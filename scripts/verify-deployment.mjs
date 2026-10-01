import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isCanonicalHealthUrl, extractDeploymentShaFromEvent } from './ci/production-evidence-lib.mjs';

const baseUrl = process.env.DEPLOYMENT_URL;

if (!baseUrl) {
  console.error('DEPLOYMENT_URL is required');
  process.exit(2);
}

// The Rex/Claude Code Action GitHub App has no `workflows` write permission
// (scripts/verify-agent-workflow-policy.mjs deliberately locks this down —
// see docs/company/PRODUCTION_ASSET_ALLOWLIST_GATE_V1.md for the identical
// constraint on the asset gate), so a dedicated CI step/artifact-upload for
// production evidence capture cannot be added to
// .github/workflows/deployment-verification.yml by Rex. Instead, this
// already-wired script installs its own bounded, pinned dependency and
// shells out to the evidence gate for the Health canonical URL, without any
// workflow file edit. A maintainer with `workflows` permission can later add
// a real `actions/upload-artifact` step for durable screenshot storage —
// see docs/company/PRODUCTION_VERIFICATION_GATE_V1.md.

// GITHUB_EVENT_PATH is a standard Actions runner env var present on every
// job without any workflow file edit. Reading the deployment_status/
// deployment payload directly binds the expected commit SHA to the actual
// validated deployment identity GitHub/Vercel reported — never to
// GITHUB_SHA (the Actions checkout SHA for this run, which is not
// necessarily the commit that was deployed, especially once the
// ignoreCommand fan-out skip can leave a later run's checkout ahead of the
// deployment it is verifying).
function resolveExpectedCommitSha() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return '';
  try {
    const event = JSON.parse(readFileSync(eventPath, 'utf8'));
    return extractDeploymentShaFromEvent(event);
  } catch (error) {
    console.error(`Could not read deployment event payload for SHA binding: ${error.message}`);
    return '';
  }
}

function captureProductionEvidence() {
  // Exact HTTPS canonical origin + path match (Issue #120 item 3) — not a
  // hostname-only check. Preview deployments (different host, or a
  // different path/query on the same host) don't need the heavy Playwright
  // install/probe this triggers, and a preview mismatching production
  // marker/commit expectations is not a production defect worth escalating.
  if (!isCanonicalHealthUrl(baseUrl)) return;

  console.log(`Capturing production evidence for ${baseUrl}...`);
  try {
    execFileSync('npm', ['install', '--no-save', '--package-lock=false', '--no-audit', '--no-fund', 'playwright@1.63.0'], {
      stdio: 'inherit',
    });
    execFileSync('npx', ['playwright', 'install', '--with-deps', 'chromium'], { stdio: 'inherit' });
  } catch (error) {
    console.error(`Could not install the pinned Playwright browser for production evidence capture: ${error.message}`);
    console.error('UNREACHABLE: production evidence capture environment could not be prepared.');
    process.exitCode = 1;
    return;
  }

  try {
    execFileSync('node', ['scripts/ci/verify-production-evidence.mjs'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        CANONICAL_URL: baseUrl,
        EXPECTED_COMMIT_SHA: resolveExpectedCommitSha(),
      },
    });
  } catch (error) {
    const status = typeof error.status === 'number' ? error.status : 1;
    if (status === 2) {
      // RATE_LIMIT_BLOCKED is an external deployment blocker, never proof of
      // success — it must still fail this script (a distinct, non-1 exit
      // code) so the calling workflow's "recovered/verified" step, which
      // only runs on success, can never interpret an unreached probe as
      // verified production evidence.
      console.error('RATE_LIMIT_BLOCKED: an external provider rate limit prevented verification. Treating as a blocking, non-success result — not as proof of success or a real defect.');
      process.exitCode = 3;
      return;
    }
    console.error(`Production evidence capture reported a real defect (exit ${status}).`);
    process.exitCode = 1;
  }
}

const requestedProfile = (process.env.VERIFY_PROFILE || 'auto').toLowerCase();
const attempts = Number(process.env.VERIFY_ATTEMPTS || 6);
const timeoutMs = Number(process.env.VERIFY_TIMEOUT_MS || 10000);
const delayMs = Number(process.env.VERIFY_DELAY_MS || 5000);

const routeProfiles = {
  sleep: ['/', '/products', '/sleep-app'],
  health: ['/'],
};

function resolveProfile() {
  if (requestedProfile !== 'auto') {
    if (!Object.hasOwn(routeProfiles, requestedProfile)) {
      throw new Error(`Unknown VERIFY_PROFILE: ${requestedProfile}`);
    }
    return requestedProfile;
  }

  const hostname = new URL(baseUrl).hostname.toLowerCase();
  return hostname.includes('health') || hostname.includes('asclepioshealth') ? 'health' : 'sleep';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'asclepios-deployment-verifier/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyRoute(route) {
  const url = new URL(route, baseUrl).toString();
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      const body = await response.text();
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!contentType.includes('text/html')) {
        throw new Error(`unexpected content-type: ${contentType || 'missing'}`);
      }
      if (!body.trim()) {
        throw new Error('empty HTML response');
      }

      console.log(`PASS ${url} -> ${response.status}`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt}/${attempts} failed for ${url}: ${error.message}`);
      if (attempt < attempts) await sleep(delayMs);
    }
  }

  throw new Error(`Deployment verification failed for ${url}: ${lastError?.message || 'unknown error'}`);
}

try {
  const profile = resolveProfile();
  const routes = routeProfiles[profile];
  console.log(`Deployment verification profile: ${profile}`);

  for (const route of routes) {
    await verifyRoute(route);
  }
  console.log(`Deployment verification passed for ${baseUrl} using ${profile} profile`);

  if (profile === 'health') {
    captureProductionEvidence();
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
