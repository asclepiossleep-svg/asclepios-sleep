import fs from 'node:fs/promises';

const V1_MANIFEST = 'apps/health-web/src/assets/pages/home/v1/manifest.json';
const V2_MANIFEST = 'apps/health-web/src/assets/pages/home/v2/manifest.json';

const fail = (msg) => {
  console.error(`HEALTH_VISUAL_DELIVERY_FAIL: ${msg}`);
  process.exit(1);
};

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const v2Candidate = await readJsonIfExists(V2_MANIFEST);
const v2Active = v2Candidate?.activation?.production_active === true;
const manifestPath = v2Active ? V2_MANIFEST : V1_MANIFEST;
const expectedVersion = v2Active ? 'v2' : 'v1';
const manifest = v2Active ? v2Candidate : await readJsonIfExists(V1_MANIFEST);

if (!manifest) fail(`${manifestPath} is missing`);

const PR_HEAD_SHA = process.env.PR_HEAD_SHA;
const PR_NUMBER = process.env.PR_NUMBER;
const PR_URL = process.env.PR_URL;

if (manifest.goal_id !== 'HEALTH-VISUAL-PILOT-001') fail('Goal ID mismatch');
if (manifest.page !== 'home' || manifest.version !== expectedVersion) {
  fail(`page/version mismatch (expected home/${expectedVersion}, found ${manifest.page}/${manifest.version})`);
}
if (manifest.owner_approval?.status !== 'APPROVED') fail('owner approval missing');

const evidence = manifest.delivery_evidence || {};
if (!['VERIFYING', 'COMPLETE'].includes(manifest.status)) fail(`page status ${manifest.status} is not delivery-eligible`);
if (!evidence.commit_sha) fail('delivery_evidence.commit_sha required in VERIFYING/COMPLETE');
if (evidence.commit_sha !== PR_HEAD_SHA) fail(`manifest commit ${evidence.commit_sha} != PR head ${PR_HEAD_SHA}`);
if (Number(evidence.pr_number) !== Number(PR_NUMBER)) fail('manifest PR number mismatch');
if (evidence.pr_url !== PR_URL) fail('manifest PR URL mismatch');

console.log(`HEALTH_VISUAL_SHA_BINDING_PASS: PR #${PR_NUMBER} head ${PR_HEAD_SHA} (manifest ${manifestPath})`);
