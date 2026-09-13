import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Production asset allowlist gate for apps/health-web.
// Every image apps/health-web imports must resolve to an entry in
// apps/health-web/asset-manifest.json with status APPROVED or PUBLISHED and
// a checksum matching the committed binary. See
// docs/company/PRODUCTION_ASSET_ALLOWLIST_GATE_V1.md for the full contract.

const APP_ROOT = 'apps/health-web';
const PUBLIC_ROOT = path.posix.join(APP_ROOT, 'public');
const MANIFEST_PATH = path.posix.join(APP_ROOT, 'asset-manifest.json');
const IMAGE_EXT = /\.(png|jpe?g|webp|svg|avif|gif)$/i;
const SOURCE_EXT = /\.(tsx?|css|html)$/i;

const ALLOWED_ACTIVE_STATUS = new Set(['APPROVED', 'PUBLISHED']);
const KNOWN_STATUS = new Set([
  'DRAFT', 'INTERNAL_REVIEW', 'CLAIMS_REVIEW', 'OWNER_REVIEW', 'APPROVED', 'PUBLISHED',
  'RETIRED', 'ARCHIVED', 'REFERENCE_ONLY', 'REPLACED', 'PLACEHOLDER', 'GENERATED', 'INVENTED',
]);
const REQUIRED_FIELDS = [
  'asset_id', 'title', 'asset_type', 'status', 'repo_path', 'checksum_sha256',
  'approved_at', 'approved_by', 'source_ref', 'rights_status',
  'version', 'owner_role', 'created_at', 'updated_at', 'archive_class',
];
const PACKAGING_TYPES = new Set(['PACKAGING', 'LABEL']);
const PACKAGING_PATH_HINT = /pack(ag(e|ing))?|label/i;

const errors = [];
const fail = (message) => errors.push(message);

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function pathExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(p) {
  const buf = await fs.readFile(p);
  return createHash('sha256').update(buf).digest('hex');
}

async function walk(root) {
  const out = [];
  const stat = await fs.stat(root).catch(() => null);
  if (!stat) return out;
  if (stat.isFile()) return [root];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.posix.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

// --- Load and validate manifest schema ---

let manifestRaw;
try {
  manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf8');
} catch {
  console.error(`FAIL asset allowlist gate: manifest not found at ${MANIFEST_PATH}.`);
  console.error('Required action: create the production asset manifest before any image ships in apps/health-web.');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(manifestRaw);
} catch (e) {
  console.error(`FAIL asset allowlist gate: ${MANIFEST_PATH} is not valid JSON (${e.message}).`);
  process.exit(1);
}

if (!Array.isArray(manifest.assets)) {
  console.error(`FAIL asset allowlist gate: ${MANIFEST_PATH} must have an "assets" array.`);
  process.exit(1);
}

const byRepoPath = new Map();
const seenAssetIds = new Set();

for (const [i, entry] of manifest.assets.entries()) {
  const where = `${MANIFEST_PATH} assets[${i}]`;
  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
      fail(`${where}: missing required field "${field}". Required action: complete the manifest entry before it can gate CI.`);
    }
  }
  if (entry.asset_id) {
    if (seenAssetIds.has(entry.asset_id)) {
      fail(`${where}: duplicate asset_id "${entry.asset_id}". Asset IDs must be immutable and unique.`);
    }
    seenAssetIds.add(entry.asset_id);
  }
  if (entry.status && !KNOWN_STATUS.has(entry.status)) {
    fail(`${where} (asset_id ${entry.asset_id}): unknown status "${entry.status}". Required action: use a controlled status from docs/company/DIGITAL_ASSET_REGISTRY_SCHEMA_V1.md or PRODUCTION_ASSET_ALLOWLIST_GATE_V1.md.`);
  }
  if (entry.repo_path) {
    if (byRepoPath.has(entry.repo_path)) {
      fail(`${MANIFEST_PATH}: repo_path "${entry.repo_path}" is registered more than once (asset_id ${entry.asset_id}). Each production file may have only one active manifest entry.`);
    }
    byRepoPath.set(entry.repo_path, entry);
  }
  if (ALLOWED_ACTIVE_STATUS.has(entry.status) && entry.rights_status && ['PENDING', 'RESTRICTED'].includes(entry.rights_status)) {
    fail(`${where} (asset_id ${entry.asset_id}): status is ${entry.status} but rights_status is ${entry.rights_status}. Required action: an APPROVED/PUBLISHED asset must not have pending/restricted usage rights.`);
  }
}

// --- Verify approved/published binaries exist and match their checksum ---

for (const entry of manifest.assets) {
  if (!ALLOWED_ACTIVE_STATUS.has(entry.status) || !entry.repo_path) continue;
  const exists = await pathExists(entry.repo_path);
  if (!exists) {
    fail(`${entry.repo_path}: manifest asset_id ${entry.asset_id} is ${entry.status} but the file is missing from the repository. Required action: restore the approved binary or retire the manifest entry.`);
    continue;
  }
  const actualHash = await sha256File(entry.repo_path);
  if (entry.checksum_sha256 && actualHash !== entry.checksum_sha256) {
    fail(`${entry.repo_path}: committed bytes do not match manifest checksum for asset_id ${entry.asset_id} (expected ${entry.checksum_sha256}, got ${actualHash}). Required action: this file was changed without an approval/version bump — restore the approved binary or register a new asset_id/version through the Drive->repo release contract.`);
  }
}

// --- Scan source for image references ---

const sourceFiles = (await walk(path.posix.join(APP_ROOT, 'src'))).filter((f) => SOURCE_EXT.test(f));
if (await pathExists(path.posix.join(APP_ROOT, 'index.html'))) {
  sourceFiles.push(path.posix.join(APP_ROOT, 'index.html'));
}

const IMPORT_RE = /(?:from\s+|import\()\s*["']([^"']+)["']/g;
const CSS_URL_RE = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
const HTML_REF_RE = /(?:src|href)\s*=\s*["']([^"']+)["']/g;

function extractCandidates(content, filePath) {
  const candidates = [];
  const regexes = filePath.endsWith('.css')
    ? [CSS_URL_RE]
    : filePath.endsWith('.html')
      ? [HTML_REF_RE]
      : [IMPORT_RE];
  for (const re of regexes) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      if (IMAGE_EXT.test(m[1])) {
        const lineNumber = content.slice(0, m.index).split('\n').length;
        candidates.push({ ref: m[1], line: lineNumber });
      }
    }
  }
  return candidates;
}

const referenced = new Map(); // repoPath -> [{file, line}]

for (const file of sourceFiles) {
  const content = await fs.readFile(file, 'utf8');
  for (const { ref, line } of extractCandidates(content, file)) {
    if (/^https?:\/\//i.test(ref) || ref.startsWith('data:')) {
      fail(`${file}:${line}: references an external/inline image "${ref}". Required action: production images must be committed repository assets registered in the manifest, not fetched at runtime from an external host.`);
      continue;
    }
    let repoPath;
    if (ref.startsWith('/')) {
      const publicCandidate = path.posix.join(PUBLIC_ROOT, ref.replace(/^\//, ''));
      repoPath = (await pathExists(publicCandidate))
        ? publicCandidate
        : path.posix.join(APP_ROOT, ref.replace(/^\//, ''));
    } else {
      repoPath = toPosix(path.posix.normalize(path.posix.join(path.posix.dirname(file), ref)));
    }
    if (!(await pathExists(repoPath))) {
      fail(`${file}:${line}: references "${ref}" which does not resolve to a file in the repository (looked for ${repoPath}).`);
      continue;
    }
    if (!referenced.has(repoPath)) referenced.set(repoPath, []);
    referenced.get(repoPath).push({ file, line });
  }
}

// --- Cross-check every referenced image against the manifest ---

for (const [repoPath, usages] of referenced) {
  const entry = byRepoPath.get(repoPath);
  const firstUsage = usages[0];
  const isPackagingLike = PACKAGING_PATH_HINT.test(repoPath) || (entry && PACKAGING_TYPES.has(entry.asset_type));

  if (!entry) {
    const packagingNote = isPackagingLike
      ? ' Product packaging must never be invented (docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md).'
      : '';
    fail(
      `${firstUsage.file}:${firstUsage.line}: "${repoPath}" is referenced by apps/health-web but is not registered in ${MANIFEST_PATH}.` +
      ` Required action: add an approved Asset ID entry (status APPROVED/PUBLISHED) via the Drive->repo release contract before this can ship.${packagingNote}`
    );
    continue;
  }

  if (!ALLOWED_ACTIVE_STATUS.has(entry.status)) {
    const guidance = {
      REFERENCE_ONLY: 'this is a reference/comp asset only and is not cleared for production use',
      REPLACED: `this asset has been replaced${entry.superseded_by_asset_id ? ` by ${entry.superseded_by_asset_id}` : ''}; switch the import to the current approved asset`,
      PLACEHOLDER: 'placeholder imagery must never ship to production',
      GENERATED: 'AI-generated/synthetic imagery must never ship as product or packaging truth',
      INVENTED: 'invented imagery must never ship to production',
      RETIRED: 'this asset has been retired and is kept for history only',
      ARCHIVED: 'this asset is archived and is kept for history only',
    }[entry.status] || `status ${entry.status} is not an approved production state`;
    const packagingNote = isPackagingLike
      ? ' Product packaging must never be invented (docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md).'
      : '';
    fail(
      `${firstUsage.file}:${firstUsage.line}: "${repoPath}" (asset_id ${entry.asset_id}) is ${entry.status}, not an approved production asset: ${guidance}.` +
      ` Required action: resolve before merging.${packagingNote}`
    );
  }
}

// --- Report ---

if (errors.length > 0) {
  console.error(`FAIL production asset allowlist gate: ${errors.length} issue(s) found.`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `PASS production asset allowlist gate: ${referenced.size} referenced image(s) in apps/health-web all resolve to an approved manifest entry with a matching checksum.`
);
