import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = process.cwd();
const v1ManifestPath = path.join(repoRoot, 'apps/health-web/src/assets/pages/home/v1/manifest.json');
const v2ManifestPath = path.join(repoRoot, 'apps/health-web/src/assets/pages/home/v2/manifest.json');
const homePath = path.join(repoRoot, 'apps/health-web/src/pages/Home.tsx');
const enPath = path.join(repoRoot, 'apps/health-web/src/i18n/en.json');

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

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
    return null;
  }
}

const IMAGE_SIGNATURES = {
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
};

function hasValidImageSignature(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.svg') {
    const head = fs.readFileSync(file, 'utf8').slice(0, 512).trimStart();
    return head.startsWith('<?xml') || head.startsWith('<svg');
  }
  const buf = fs.readFileSync(file);
  if (ext === '.webp') {
    return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  }
  const sigs = IMAGE_SIGNATURES[ext];
  if (!sigs) return true;
  return sigs.some((sig) => buf.length >= sig.length && sig.every((byte, i) => buf[i] === byte));
}

// Home v2 activates deterministically (scripts/ci/activate-health-home-v2.mjs) by flipping
// v2/manifest.json's activation.production_active to true once its governed bytes verify.
// Until that happens, v1 remains the valid, enforced fallback -- never hardcode which
// version is "current".
const v2Manifest = readJsonIfExists(v2ManifestPath);
const v2Active = v2Manifest?.activation?.production_active === true;
const activeVersion = v2Active ? 'v2' : 'v1';
const manifestPath = v2Active ? v2ManifestPath : v1ManifestPath;
const manifest = v2Active ? v2Manifest : readJsonIfExists(v1ManifestPath);

assert(manifest, `Home ${activeVersion} manifest.json is missing`);
if (!manifest || process.exitCode) process.exit(process.exitCode || 1);

const allowedStates = new Set(['DRAFT', 'OWNER_APPROVED', 'IMPLEMENTING', 'VERIFYING', 'BLOCKED', 'RECOVERING', 'COMPLETE']);

function resolveManifestRelative(rel) {
  return path.resolve(path.dirname(manifestPath), rel);
}

assert(/^1\.2\./.test(manifest.schema_version || ''), 'schema_version must be 1.2.x');
assert(manifest.goal_id === 'HEALTH-VISUAL-PILOT-001', 'goal_id must match HEALTH-VISUAL-PILOT-001');
assert(manifest.page === 'home' && manifest.version === activeVersion, `page/version must be home/${activeVersion}`);
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
    assert(
      hasValidImageSignature(file),
      `approved reference is not a valid decodable image for extension ${path.extname(file)}: ${reference.path}`,
    );
  }
}

assert(Array.isArray(manifest.assets) && manifest.assets.length > 0, 'manifest must list at least one approved asset');
const listedAbsolutePaths = new Set();
const listedRoles = new Set();
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
    assert(
      hasValidImageSignature(file),
      `${asset.id || 'asset'} is not a valid image for extension ${path.extname(file)}: ${asset.path}`,
    );
  }
  listedAbsolutePaths.add(path.normalize(file));
  listedRoles.add(asset.role);
}

// The approved full-page reference is source-of-truth evidence only. Production Home
// visuals must be individual, owner-approved, versioned assets in the manifest, for
// whichever version (v1 fallback or active v2) is currently in force.
const requiredHomeRoles = ['hero', 'products_card', 'sleep_app_card', 'learning_card'];
for (const role of requiredHomeRoles) {
  assert(listedRoles.has(role), `manifest missing required owner-approved Home visual role: ${role}`);
}

assert(fs.existsSync(homePath), 'Home.tsx is missing');
const homeSource = fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : '';
assert(
  !/ReferenceCrop|approvedHomeReference/.test(homeSource),
  'Home.tsx must not render crops from the full-page approved reference; use individual manifest-approved assets instead',
);

// Every Home production asset imported directly by Home.tsx must be declared in whichever
// manifest (v1 fallback or active v2) is currently in force -- resolve both sides to absolute
// paths so this works regardless of which version's asset directory an import points at (v2
// may legitimately re-use unchanged v1 assets for roles it did not re-version).
const importMatches = [...homeSource.matchAll(/from\s+["']((?:\.\.\/)+assets\/pages\/home\/[^"']+)["']/g)];
for (const match of importMatches) {
  const importSpecifier = match[1];
  if (/^approved-home-reference(?:-v\d+)?\.(?:png|webp)$/i.test(path.basename(importSpecifier))) continue;
  const absoluteImportPath = path.normalize(path.resolve(path.dirname(homePath), importSpecifier));
  assert(
    listedAbsolutePaths.has(absoluteImportPath),
    `Home.tsx imports unlisted Home ${activeVersion} asset: ${path.relative(repoRoot, absoluteImportPath)}`,
  );
}

// Lock the owner-approved Home copy from the execution contract.
assert(fs.existsSync(enPath), 'English locale file is missing');
if (fs.existsSync(enPath)) {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  assert(en['health.hero.title.line1'] === 'Better Sleep.', 'approved hero title line 1 must be exactly "Better Sleep."');
  assert(en['health.hero.title.line2'] === 'Healthier Living.', 'approved hero title line 2 must be exactly "Healthier Living."');
  assert(en['health.hero.cta.products'] === 'Explore Products', 'approved primary CTA must be exactly "Explore Products"');
  assert(en['health.hero.cta.sleepApp'] === 'Enter Sleep App', 'approved secondary CTA must be exactly "Enter Sleep App"');
}
assert(
  !/health\.hero\.cta\.(?:products|sleepApp)"\)\}\s*→/.test(homeSource),
  'hero CTA labels must not append an unapproved arrow glyph',
);

// Prohibit remote visual sources in the governed Home implementation. Discover the CSS
// Home.tsx actually imports instead of hardcoding a version-specific stylesheet name, so
// this keeps working whether v1's home-approved-v1.css is still current or a later version
// introduces its own stylesheet.
const cssImportMatches = [...homeSource.matchAll(/import\s+["'](\.\.\/styles\/[^"']+\.css)["']/g)];
const filesToScan = [['Home.tsx', homePath]];
for (const match of cssImportMatches) {
  const cssFile = path.resolve(path.dirname(homePath), match[1]);
  filesToScan.push([path.relative(repoRoot, cssFile), cssFile]);
}
for (const [name, file] of filesToScan) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  assert(!/(?:src|href)\s*=\s*["']https?:\/\//i.test(text), `${name} contains a remote visual URL`);
  assert(!/url\(\s*["']?https?:\/\//i.test(text), `${name} contains a remote CSS visual URL`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log(
  `HEALTH_VISUAL_POLICY_PASS: Home ${activeVersion} manifest, required individual visual roles, hashes, image signatures, approval binding, exact owner-approved hero copy, and approved-asset policy are valid.`,
);
