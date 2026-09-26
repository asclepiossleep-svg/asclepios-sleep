import fs from 'node:fs/promises';

// Offline contract pilot. The second input is a mocked source-record bundle,
// never an agent assertion or a live API response.
const [handoffPath, sourcePath, flag, scenario] = process.argv.slice(2);
if (!handoffPath || !sourcePath || (flag && flag !== '--scenario') || (flag && !scenario)) {
  console.error('Usage: node scripts/ci/validate-visual-evidence-contract.mjs HANDOFF.json SOURCE_RECORDS.json [--scenario NAME]');
  process.exit(2);
}

const errors = [];
const notes = [];
const fail = (code, status, detail) => errors.push({ code, status, detail });
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const present = (value) => typeof value === 'string' && value.trim() !== '' &&
  !/^(NONE|UNKNOWN|NULL|TODO|PLACEHOLDER)$/i.test(value) && !/^<.*>$/.test(value);
const url = (value) => present(value) && /^https:\/\/[^\s/]+\//.test(value);
const eq = (actual, expected, code, detail) => {
  if (actual !== expected) fail(code, 'MISMATCHED', detail);
};

let handoff;
let records;
try {
  handoff = JSON.parse(await fs.readFile(handoffPath, 'utf8'));
  records = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
} catch (error) {
  console.error(`BLOCKED [INVALID] INPUT_PARSE: ${error.message}`);
  process.exit(1);
}
if (flag) {
  const override = records.scenarios?.[scenario];
  if (!override) fail('SCENARIO_UNKNOWN', 'INVALID', `mock source scenario ${scenario} does not exist`);
  else for (const [key, value] of Object.entries(override)) records[key] = value;
}

const profile = records.profile ?? {};
const commit = handoff.implementation_commit_sha;
if (!sha(commit)) fail('COMMIT_INVALID', 'INVALID', 'implementation_commit_sha must be a full 40-character SHA');
if (!present(handoff.handoff_id) || !present(handoff.run_id)) {
  fail('HANDOFF_ID_MISSING', 'EVIDENCE_INCOMPLETE', 'handoff comment ID and run ID are required');
}
if (!present(profile.id) || !present(profile.goal_id) || !present(profile.locked_at) ||
    !present(handoff.created_at) || Date.parse(profile.locked_at) > Date.parse(handoff.created_at) ||
    !Number.isFinite(Date.parse(profile.locked_at)) || !Number.isFinite(Date.parse(handoff.created_at))) {
  fail('PROFILE_NOT_LOCKED', 'INVALID', 'Goal profile must be identified and locked before handoff');
}
eq(handoff.goal_id, profile.goal_id, 'GOAL_ID_MISMATCH', 'handoff Goal ID differs from authoritative Goal profile');
const applicability = profile.required ?? {};
for (const key of ['asset_manifest', 'desktop', 'mobile', 'deployment', 'owner_approval']) {
  if (typeof applicability[key] !== 'boolean') {
    fail('APPLICABILITY_UNDECLARED', 'EVIDENCE_INCOMPLETE', `Goal profile must declare ${key} before execution`);
  } else if (!applicability[key]) notes.push(`NOT_APPLICABLE ${key}: pre-execution Goal profile waiver`);
}
const sourceHandoff = records.handoff ?? {};
if (!url(sourceHandoff.url)) fail('HANDOFF_SOURCE_MISSING', 'EVIDENCE_INCOMPLETE', 'source handoff comment URL is required');
eq(sourceHandoff.id, handoff.handoff_id, 'HANDOFF_SOURCE_MISMATCH', 'handoff ID does not resolve to source comment');
eq(sourceHandoff.run_id, handoff.run_id, 'HANDOFF_RUN_MISMATCH', 'handoff run ID differs from source comment');
eq(sourceHandoff.goal_id, handoff.goal_id, 'HANDOFF_GOAL_MISMATCH', 'source comment Goal ID differs from handoff');
eq(sourceHandoff.commit_sha, commit, 'HANDOFF_COMMIT_MISMATCH', 'source comment commit differs from handoff');

const pr = records.pr ?? {};
if (!present(pr.id) || !url(pr.url)) fail('PR_SOURCE_MISSING', 'EVIDENCE_INCOMPLETE', 'PR source ID and URL are required');
eq(pr.number, handoff.pr_number, 'PR_NUMBER_MISMATCH', 'PR number differs from GitHub source');
eq(pr.head_sha, commit, 'PR_HEAD_MISMATCH', 'GitHub PR head differs from implementation commit');
eq(handoff.pr_head_sha, pr.head_sha, 'PR_CLAIM_MISMATCH', 'handoff PR SHA differs from GitHub source');

const requiredChecks = profile.required_checks;
if (!Array.isArray(requiredChecks) || !requiredChecks.length) {
  fail('CHECK_PROFILE_MISSING', 'EVIDENCE_INCOMPLETE', 'required check names must be declared by Goal profile');
} else for (const name of requiredChecks) {
  const check = (records.checks ?? []).find(item => item.name === name);
  if (!check || !present(check.id) || !url(check.url) || !handoff.check_run_ids?.includes(check.id)) {
    fail('CHECK_SOURCE_MISSING', 'EVIDENCE_INCOMPLETE', `required check ${name} lacks a source run ID/URL`);
    continue;
  }
  eq(check.head_sha, commit, 'CHECK_SHA_MISMATCH', `required check ${name} belongs to another commit`);
  if (check.conclusion !== 'SUCCESS') {
    fail('REQUIRED_CHECK_NOT_SUCCESS', 'BLOCKED', `required check ${name} conclusion is ${check.conclusion ?? 'MISSING'}`);
  }
}

if (applicability.asset_manifest === true) {
  const manifest = records.manifest ?? {};
  if (!present(manifest.id) || !present(manifest.path) || !url(manifest.url) || !sha(manifest.commit_sha)) {
    fail('MANIFEST_SOURCE_MISSING', 'EVIDENCE_INCOMPLETE', 'manifest source ID, path, URL and commit SHA are required');
  }
  if (!Array.isArray(profile.required_assets) || !profile.required_assets.length) {
    fail('ASSET_PROFILE_MISSING', 'EVIDENCE_INCOMPLETE', 'Goal profile must enumerate required assets');
  }
  eq(manifest.path, profile.asset_manifest_path, 'MANIFEST_PROFILE_MISMATCH', 'source manifest differs from pre-execution Goal profile');
  eq(handoff.asset_manifest_path, manifest.path, 'MANIFEST_PATH_MISMATCH', 'handoff manifest path differs from source');
  eq(handoff.asset_manifest_commit_sha, commit, 'MANIFEST_COMMIT_MISMATCH', 'handoff manifest commit differs from implementation commit');
  eq(manifest.commit_sha, commit, 'MANIFEST_SOURCE_SHA_MISMATCH', 'source manifest is not read at implementation commit');
  eq(manifest.goal_id, profile.goal_id, 'MANIFEST_GOAL_MISMATCH', 'manifest Goal ID differs from profile');
  for (const required of profile.required_assets ?? []) {
    const asset = (manifest.assets ?? []).find(item => item.id === required.id);
    const file = (records.committed_assets ?? []).find(item => item.path === asset?.path);
    if (!asset || !file || !present(asset.version) || !present(asset.path) ||
        !digest(asset.sha256) || !digest(file.sha256) || !present(asset.approval_record_id)) {
      fail('ASSET_SOURCE_MISSING', 'EVIDENCE_INCOMPLETE', `asset ${required.id} lacks manifest entry, committed byte digest or approval ID`);
      continue;
    }
    eq(asset.version, required.version, 'ASSET_VERSION_MISMATCH', `asset ${required.id} version differs from profile`);
    eq(file.commit_sha, commit, 'ASSET_COMMIT_MISMATCH', `asset ${required.id} bytes are not from implementation commit`);
    eq(asset.sha256, file.sha256, 'ASSET_SHA_MISMATCH', `asset ${required.id} manifest SHA-256 differs from committed-byte source`);
    const assetApproval = (records.asset_approvals ?? []).find(item => item.id === asset.approval_record_id);
    if (!assetApproval || !url(assetApproval.source_url) || !present(assetApproval.approver)) {
      fail('ASSET_APPROVAL_MISSING', 'EVIDENCE_INCOMPLETE', `asset ${required.id} approval source is not resolvable`);
    } else {
      eq(assetApproval.scope?.asset_id, asset.id, 'ASSET_APPROVAL_ID_MISMATCH', `asset ${required.id} approval covers another asset`);
      eq(assetApproval.scope?.version, asset.version, 'ASSET_APPROVAL_VERSION_MISMATCH', `asset ${required.id} approval covers another version`);
      eq(assetApproval.scope?.sha256, asset.sha256, 'ASSET_APPROVAL_SHA_MISMATCH', `asset ${required.id} approval covers another digest`);
    }
  }
}

const deployment = records.deployment ?? {};
if (applicability.deployment === true) {
  if (!present(handoff.vercel_deployment_id) || !present(deployment.id) ||
      !present(deployment.project_id) || !url(deployment.url) || !sha(deployment.deployed_commit_sha)) {
    fail('DEPLOYMENT_EVIDENCE_INCOMPLETE', 'EVIDENCE_INCOMPLETE', 'deployment ID, project, URL and source-reported SHA are required');
  } else {
    eq(handoff.vercel_deployment_id, deployment.id, 'DEPLOYMENT_ID_MISMATCH', 'handoff deployment ID differs from source');
    eq(deployment.project_id, profile.vercel_project_id, 'DEPLOYMENT_PROJECT_MISMATCH', 'deployment belongs to another project');
    eq(deployment.deployed_commit_sha, commit, 'DEPLOYMENT_SHA_MISMATCH', 'deployed commit differs from implementation commit');
    if (deployment.status !== 'READY') fail('DEPLOYMENT_NOT_READY', 'BLOCKED', 'deployment source is not READY');
  }
}

const artifacts = records.visual_artifacts ?? [];
for (const kind of ['desktop', 'mobile']) {
  if (applicability[kind] !== true) continue;
  const id = handoff[`${kind}_artifact_id`];
  const artifact = artifacts.find(item => item.id === id);
  if (!present(id) || !artifact || !present(artifact.source_run_id) || !url(artifact.url) ||
      !digest(artifact.sha256) || !sha(artifact.capture_commit_sha)) {
    fail(`${kind.toUpperCase()}_EVIDENCE_MISSING`, 'EVIDENCE_INCOMPLETE', `${kind} requires an immutable artifact ID, source run, URL, digest and capture SHA`);
    continue;
  }
  eq(artifact.kind, kind, 'VISUAL_KIND_MISMATCH', `${kind} artifact has wrong kind`);
  eq(artifact.capture_commit_sha, commit, 'VISUAL_SHA_MISMATCH', `${kind} capture commit differs from implementation commit`);
  if (applicability.deployment === true) eq(artifact.deployment_id, deployment.id, 'VISUAL_DEPLOYMENT_MISMATCH', `${kind} artifact belongs to another deployment`);
  const run = (records.visual_runs ?? []).find(item => item.id === artifact.source_run_id);
  if (!run || !sha(run.head_sha) || !url(run.url)) fail('VISUAL_RUN_MISSING', 'EVIDENCE_INCOMPLETE', `${kind} source run ID, URL and SHA are required`);
  else {
    eq(run.head_sha, commit, 'VISUAL_RUN_SHA_MISMATCH', `${kind} source run belongs to another commit`);
    if (run.conclusion !== 'SUCCESS') fail('VISUAL_RUN_NOT_SUCCESS', 'BLOCKED', `${kind} source run did not succeed`);
  }
  if (!Number.isInteger(artifact.viewport?.width) || !Number.isInteger(artifact.viewport?.height) ||
      artifact.viewport.width <= 0 || artifact.viewport.height <= 0) {
    fail('VISUAL_VIEWPORT_INVALID', 'INVALID', `${kind} viewport width/height are required`);
  } else if (artifact.viewport.width !== profile.viewports?.[kind]?.width ||
             artifact.viewport.height !== profile.viewports?.[kind]?.height) {
    fail('VISUAL_VIEWPORT_MISMATCH', 'MISMATCHED', `${kind} viewport differs from pre-execution Goal profile`);
  }
  if (artifact.verification_status !== 'PASSED') fail('VISUAL_NOT_VERIFIED', 'BLOCKED', `${kind} source verification did not pass`);
}
if (applicability.desktop === true && applicability.mobile === true &&
    handoff.desktop_artifact_id === handoff.mobile_artifact_id) {
  fail('VISUAL_ARTIFACTS_NOT_DISTINCT', 'INVALID', 'desktop and mobile artifacts must be distinct');
}

if (applicability.owner_approval === true) {
  const approval = records.approval ?? {};
  if (!present(handoff.owner_approval_record_id) || !present(approval.id) ||
      !present(approval.approver) || !Number.isFinite(Date.parse(approval.approved_at)) ||
      !present(approval.source_url)) {
    fail('OWNER_APPROVAL_MISSING', 'EVIDENCE_INCOMPLETE', 'source approval ID, approver, timestamp and URL are required');
  } else {
    if (!url(approval.source_url)) fail('APPROVAL_SOURCE_INVALID', 'EVIDENCE_INCOMPLETE', 'final approval source must be a valid HTTPS URL');
    eq(handoff.owner_approval_record_id, approval.id, 'APPROVAL_ID_MISMATCH', 'handoff approval ID differs from source');
    eq(approval.approver, 'Edmund', 'APPROVER_MISMATCH', 'approval is not from Edmund');
    eq(approval.scope?.goal_id, profile.goal_id, 'APPROVAL_GOAL_MISMATCH', 'approval covers another Goal');
    eq(approval.scope?.profile_id, profile.id, 'APPROVAL_PROFILE_MISMATCH', 'approval covers another profile');
    eq(approval.scope?.version, profile.version, 'APPROVAL_VERSION_MISMATCH', 'approval covers another version');
    eq(approval.scope?.implementation_commit_sha, commit, 'APPROVAL_COMMIT_MISMATCH', 'final approval covers another commit');
    if (applicability.deployment === true) eq(approval.scope?.deployment_id, deployment.id, 'APPROVAL_DEPLOYMENT_MISMATCH', 'final approval covers another deployment');
    if (applicability.desktop === true) eq(approval.scope?.desktop_artifact_id, handoff.desktop_artifact_id, 'APPROVAL_DESKTOP_MISMATCH', 'final approval covers another desktop artifact');
    if (applicability.mobile === true) eq(approval.scope?.mobile_artifact_id, handoff.mobile_artifact_id, 'APPROVAL_MOBILE_MISMATCH', 'final approval covers another mobile artifact');
  }
}

for (const note of notes) console.log(note);
if (errors.length) {
  for (const error of errors) console.error(`RESULT=BLOCKED EVIDENCE_STATUS=${error.status} CODE=${error.code}: ${error.detail}`);
  process.exit(1);
}
console.log(`PASS VERIFIED: mocked source records bind Goal ${profile.goal_id} to commit ${commit}; Rex recommendation ${handoff.recommendation ?? 'NONE'} was not treated as proof`);
