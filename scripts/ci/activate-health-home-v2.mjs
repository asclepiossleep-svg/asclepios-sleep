import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const V2_DIR = 'apps/health-web/src/assets/pages/home/v2';
const HOME_TSX = 'apps/health-web/src/pages/Home.tsx';
const REGISTRY = 'apps/health-web/asset-manifest.json';
const PREFLIGHT = 'scripts/ci/health-convergence-preflight.mjs';
const MANIFEST = `${V2_DIR}/manifest.json`;

const expected = {
  reference: '9bd1cc1b9bba55d5f133b463dbbeb04e43289172de5a9818d034ca9e1bb1c304',
  hero: '5ab156327c71778b662620780d979c4c2e37da48470575141dbb1ce708ab103b',
  products: 'aa4e011523f262b5b1dec467a597fa4b5d7d971387fe8a6c920293ab089a4f98',
};

const files = {
  reference: `${V2_DIR}/approved-home-reference-v2.png`,
  hero: `${V2_DIR}/web/health-home-hero-v2.webp`,
  products: `${V2_DIR}/web/health-home-products-card-v2.webp`,
};

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const read = (p) => fs.readFile(path.join(ROOT, p));
const readText = (p) => fs.readFile(path.join(ROOT, p), 'utf8');
const writeText = (p, s) => fs.writeFile(path.join(ROOT, p), s);

function validSignature(key, bytes) {
  if (key === 'reference') return bytes.length >= 8 && bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  return bytes.length >= 12 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
}

for (const [key, file] of Object.entries(files)) {
  const bytes = await read(file);
  const actual = sha256(bytes);
  if (actual !== expected[key]) throw new Error(`${file}: SHA mismatch; expected ${expected[key]}, got ${actual}`);
  if (!validSignature(key, bytes)) throw new Error(`${file}: invalid binary signature`);
  console.log(`VERIFIED ${file} ${actual}`);
}

const manifest = JSON.parse(await readText(MANIFEST));
if (manifest.version !== 'v2' || manifest.status !== 'OWNER_APPROVED') throw new Error('Home v2 manifest is not owner-approved v2');
if (manifest.approved_reference?.sha256 !== expected.reference) throw new Error('Home v2 reference SHA contract mismatch');
if (manifest.assets.find((a) => a.role === 'hero')?.sha256 !== expected.hero) throw new Error('Home v2 hero SHA contract mismatch');
if (manifest.assets.find((a) => a.role === 'products_card')?.sha256 !== expected.products) throw new Error('Home v2 products SHA contract mismatch');

// Activate Home.tsx only after all three governed v2 binaries are verified.
let home = await readText(HOME_TSX);
home = home
  .replace('../assets/pages/home/v1/web/health-home-hero-v1.webp', '../assets/pages/home/v2/web/health-home-hero-v2.webp')
  .replace('../assets/pages/home/v1/web/health-home-products-card-v1.webp', '../assets/pages/home/v2/web/health-home-products-card-v2.webp');
if (!home.includes('../assets/pages/home/v2/web/health-home-hero-v2.webp') || !home.includes('../assets/pages/home/v2/web/health-home-products-card-v2.webp')) {
  throw new Error('Home.tsx v2 import activation failed');
}
await writeText(HOME_TSX, home);

// Add v2 exact-byte registry entries while leaving v1 history intact.
const registry = JSON.parse(await readText(REGISTRY));
const entries = [
  {
    asset_id: 'ASC-HEALTH-HOME-V2-HERO-0001', title: 'Home v2 approved hero', asset_type: 'IMAGE_MASTER', product_code: null,
    language: 'N-A', version: 2, status: 'APPROVED', owner_role: 'Owner/Chairman', created_at: '2026-09-14', updated_at: '2026-09-15',
    approved_at: '2026-09-14', approved_by: 'Edmund', source_ref: 'issue-114-comment-5658747865', rights_status: 'OWNED',
    repo_path: files.hero, checksum_sha256: expected.hero, archive_class: 'HOT', supersedes_asset_id: 'ASC-HEALTH-HOME-V1-HERO-0001',
    drive_reference: null, notes: 'Owner-approved Home v2 hero; exact bytes verified before activation.'
  },
  {
    asset_id: 'ASC-HEALTH-HOME-V2-PRODUCTS-0001', title: 'Home v2 approved Products card', asset_type: 'IMAGE_MASTER', product_code: null,
    language: 'N-A', version: 2, status: 'APPROVED', owner_role: 'Owner/Chairman', created_at: '2026-09-14', updated_at: '2026-09-15',
    approved_at: '2026-09-14', approved_by: 'Edmund', source_ref: 'issue-114-comment-5658747865', rights_status: 'OWNED',
    repo_path: files.products, checksum_sha256: expected.products, archive_class: 'HOT', supersedes_asset_id: 'ASC-HEALTH-HOME-V1-PRODUCTS-0001',
    drive_reference: null, notes: 'Owner-approved Home v2 Products card; exact bytes verified before activation.'
  }
];
for (const entry of entries) {
  const existing = registry.assets.findIndex((a) => a.repo_path === entry.repo_path);
  if (existing >= 0) registry.assets[existing] = entry; else registry.assets.push(entry);
}
registry.note = 'Repository-readable production asset allowlist for apps/health-web. Home v2 hero and Products entries are owner-approved and exact-byte verified; v1 entries are retained as history.';
await writeText(REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);

// Flip v2 manifest into VERIFYING only after bytes + code + registry are synchronized.
manifest.activation.production_active = true;
manifest.activation.activated_by = 'deterministic-script';
manifest.verification.asset_policy = 'PENDING_CI';
manifest.verification.manifest_validation = 'PENDING_CI';
manifest.verification.build = 'PENDING';
manifest.verification.browser = 'PENDING';
manifest.verification.visual = 'PENDING';
manifest.verification.commit_consistency = 'PENDING';
manifest.verification.final_status = 'VERIFYING';
manifest.status = 'VERIFYING';
await writeText(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

// Point the existing convergence preflight at Home v2; preserve all existing gate behavior.
let preflight = await readText(PREFLIGHT);
preflight = preflight
  .replace("const PAGE_MANIFEST = 'apps/health-web/src/assets/pages/home/v1/manifest.json';", "const PAGE_MANIFEST = 'apps/health-web/src/assets/pages/home/v2/manifest.json';")
  .replace("page.version !== 'v1'", "page.version !== 'v2'")
  .replace("Home v1 manifest Goal/page/version contract is invalid", "Home v2 manifest Goal/page/version contract is invalid")
  .replace("version: 'v1'", "version: 'v2'");
if (!preflight.includes("pages/home/v2/manifest.json") || !preflight.includes("version: 'v2'")) throw new Error('Preflight v2 activation failed');
await writeText(PREFLIGHT, preflight);

console.log('HEALTH_HOME_V2_ACTIVATION_PASS: exact v2 bytes verified; Home imports, registry, v2 manifest and convergence preflight are synchronized.');
