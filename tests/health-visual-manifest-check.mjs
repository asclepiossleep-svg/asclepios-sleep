import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repoRoot, 'apps/health-web/src/assets/pages/home/v1/manifest.json');
const homePath = path.join(repoRoot, 'apps/health-web/src/pages/Home.tsx');
const homeCssPath = path.join(repoRoot, 'apps/health-web/src/styles/home-approved-v1.css');

function fail(message) {
  console.error(`HEALTH_VISUAL_POLICY_FAIL: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function resolveManifestRelative(rel) {
  return path.resolve(path.dirname(manifestPath), rel);
}

assert(fs.existsSync(manifestPath), 'Home v1 manifest.json is missing');
if (!fs.existsSync(manifestPath)) process.exit(1);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const allowedStates = new Set(['DRAFT', 'OWNER_APPROVED', 'IMPLEMENTING', 'VERIFYING', 'BLOCKED', 'RECOVERING', 'COMPLETE']);

assert(/^1\.2\./.test(manifest.schema_version || ''), 'schema_version must be 1.2.x');
assert(manifest.goal_id === 'HEALTH-VISUAL-PILOT-001', 'goal_id must match HEALTH-VISUAL-PILOT-001');
assert(manifest.page === 'home' && manifest.version === 'v1', 'page/version must be home/v1');
assert(allowedStates.has(manifest.status), `invalid manifest status: ${manifest.status}`);
assert(manifest.owner_approval?.status === 'APPROVED', 'owner approval must be APPROVED before implementation');
assert((manifest.owner_approval?.approval_record || '').includes('/issues/114#'), 'owner approval must link to Issue #114');
assert(manifest.implementation?.external_urls_allowed === false, 'external visual URLs must remain disabled');
assert(manifest.implementation?.generated_substitutions_allowed === false, 'generated substitutions must remain disabled');

const reference = manifest.approved_reference;
assert(reference?.path, 'approved_reference.path is required');
assert(/^[a-f0-9]{64}$/.test(reference?.sha256 || ''), 'approved_reference.sha256 must be a SHA-256');
if (reference?.path) {
  const file = resolveManifestRelative(reference.path);
  assert(fs.existsSync(file), `approved reference missing: ${reference.path}`);
  if (fs.existsSync(file) && reference.sha256) {
    const actualReferenceHash = sha256(file);
    assert(
      actualReferenceHash === reference.sha256,
      `approved reference hash mismatch: manifest=${reference.sha256} actual=${actualReferenceHash}`,
    );
  }
}

assert(Array.isArray(manifest.assets) && manifest.assets.length > 0, 'manifest must list at least one approved asset');
const listedPaths = new Set();
for (const asset of manifest.assets || []) {
  assert(asset.id && asset.role, 'each asset needs id and role');
  assert(asset.owner_approved === true, `${asset.id || 'asset'} is not owner-approved`);
  assert(/^v\d+$/.test(asset.version || ''), `${asset.id || 'asset'} has invalid version`);
  assert((asset.approval_record || '').includes('/issues/114#'), `${asset.id || 'asset'} approval must link to Issue #114`);
  assert(/^[a-f0-9]{64}$/.test(asset.sha256 || ''), `${asset.id || 'asset'} must declare SHA-256`);
  assert(/-v\d+\.[a-z0-9]+$/i.test(asset.path || ''), `${asset.id || 'asset'} filename must be versioned`);
  const file = resolveManifestRelative(asset.path);
  assert(fs.existsSync(file), `approved asset missing: ${asset.path}`);
  if (fs.existsSync(file) && asset.sha256) {
    const actualAssetHash = sha256(file);
    assert(
      actualAssetHash === asset.sha256,
      `${asset.id || 'asset'} hash mismatch: manifest=${asset.sha256} actual=${actualAssetHash}`,
    );
  }
  listedPaths.add(path.normalize(asset.path));
}

// Every Home v1 production asset imported directly by Home.tsx must be declared in the manifest.
const homeSource = fs.readFileSync(homePath, 'utf8');
const importMatches = [...homeSource.matchAll(/from\s+["']\.\.\/assets\/pages\/home\/v1\/(?!approved-home-reference\.png)([^"']+)["']/g)];
for (const match of importMatches) {
  const rel = path.normalize(`./${match[1]}`);
  assert(listedPaths.has(rel), `Home.tsx imports unlisted Home v1 asset: ${rel}`);
}

// Prohibit remote visual sources in the governed Home implementation.
for (const [name, file] of [['Home.tsx', homePath], ['home-approved-v1.css', homeCssPath]]) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  assert(!/(?:src|href)\s*=\s*["']https?:\/\//i.test(text), `${name} contains a remote visual URL`);
  assert(!/url\(\s*["']?https?:\/\//i.test(text), `${name} contains a remote CSS visual URL`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('HEALTH_VISUAL_POLICY_PASS: Home v1 manifest, hashes, approval binding, and approved-asset policy are valid.');
