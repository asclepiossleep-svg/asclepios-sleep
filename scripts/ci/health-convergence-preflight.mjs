import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const PAGE_MANIFEST = 'apps/health-web/src/assets/pages/home/v1/manifest.json';
const GLOBAL_REGISTRY = 'apps/health-web/asset-manifest.json';
const REPORT_PATH = 'artifacts/health-convergence-preflight.json';
const ACTIVE = new Set(['APPROVED', 'PUBLISHED']);

const blockers = [];
const add = (code, message, extra = {}) => blockers.push({ code, classification: 'INTERNAL_BLOCKED', retryable: false, message, ...extra });
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function validSignature(file, buf) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return buf.length >= 8 && Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).equals(buf.subarray(0,8));
  if (ext === '.webp') return buf.length >= 12 && buf.toString('ascii',0,4) === 'RIFF' && buf.toString('ascii',8,12) === 'WEBP';
  if (ext === '.jpg' || ext === '.jpeg') return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === '.gif') return buf.length >= 6 && ['GIF87a','GIF89a'].includes(buf.toString('ascii',0,6));
  if (ext === '.svg') return buf.toString('utf8',0,512).trimStart().match(/^(<\?xml|<svg)/) !== null;
  return true;
}

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { add('MANIFEST_READ_FAIL', `${file}: ${error.message}`); return null; }
}

async function verifyBinary(repoPath, expectedSha, label) {
  let buf;
  try { buf = await fs.readFile(repoPath); }
  catch { add('ASSET_MISSING', `${label}: missing ${repoPath}`, { repo_path: repoPath, expected_sha256: expectedSha }); return; }
  const actual = sha256(buf);
  if (actual !== expectedSha) add('ASSET_SHA_MISMATCH', `${label}: SHA-256 mismatch`, { repo_path: repoPath, expected_sha256: expectedSha, actual_sha256: actual });
  if (!validSignature(repoPath, buf)) add('ASSET_INVALID_BINARY', `${label}: invalid ${path.extname(repoPath)} binary signature`, { repo_path: repoPath });
}

const page = await readJson(PAGE_MANIFEST);
const registry = await readJson(GLOBAL_REGISTRY);

if (page && registry) {
  if (page.goal_id !== 'HEALTH-VISUAL-PILOT-001' || page.page !== 'home' || page.version !== 'v1') {
    add('GOAL_SCOPE_MISMATCH', 'Home v1 manifest Goal/page/version contract is invalid');
  }

  const pageDir = path.dirname(PAGE_MANIFEST);
  if (page.approved_reference?.path && page.approved_reference?.sha256) {
    await verifyBinary(path.resolve(pageDir, page.approved_reference.path), page.approved_reference.sha256, 'approved-home-reference');
  } else {
    add('REFERENCE_METADATA_MISSING', 'approved_reference path/SHA is missing');
  }

  const globalByPath = new Map((registry.assets || []).map((a) => [a.repo_path, a]));
  const requiredRoles = new Set(['hero','products_card','sleep_app_card','learning_card']);
  const seenRoles = new Set();

  for (const asset of page.assets || []) {
    seenRoles.add(asset.role);
    const absolute = path.resolve(pageDir, asset.path || '');
    const repoPath = path.relative(process.cwd(), absolute).split(path.sep).join('/');
    await verifyBinary(absolute, asset.sha256, asset.id || asset.role || 'asset');

    const global = globalByPath.get(repoPath);
    if (!global) {
      add('REGISTRY_ENTRY_MISSING', `${asset.id}: ${repoPath} is absent from global asset registry`, { repo_path: repoPath });
      continue;
    }
    if (!ACTIVE.has(global.status)) add('REGISTRY_STATUS_INVALID', `${asset.id}: registry status ${global.status} is not production-active`, { asset_id: global.asset_id });
    if (global.checksum_sha256 !== asset.sha256) {
      add('REGISTRY_SHA_DIVERGENCE', `${asset.id}: page manifest and global registry disagree on SHA-256`, {
        repo_path: repoPath,
        page_sha256: asset.sha256,
        registry_sha256: global.checksum_sha256,
      });
    }
  }

  for (const role of requiredRoles) if (!seenRoles.has(role)) add('PAGE_ROLE_MISSING', `Home v1 manifest missing required role: ${role}`);
}

const report = {
  schema_version: '1.0.0',
  goal_id: 'HEALTH-VISUAL-PILOT-001',
  pr: 116,
  page: 'home',
  version: 'v1',
  status: blockers.length ? 'INTERNAL_BLOCKED' : 'READY_FOR_BUILD',
  can_run_build_browser_visual: blockers.length === 0,
  external_deployment: { status: 'NOT_EVALUATED', classification: 'EXTERNAL_DEPENDENCY', provider: 'Vercel' },
  blockers,
};

await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`HEALTH_CONVERGENCE_PREFLIGHT=${JSON.stringify(report)}`);

if (blockers.length) {
  console.error(`HEALTH_CONVERGENCE_PREFLIGHT_BLOCKED: ${blockers.length} deterministic internal blocker(s).`);
  for (const b of blockers) console.error(`- ${b.code}: ${b.message}`);
  process.exit(1);
}

console.log('HEALTH_CONVERGENCE_PREFLIGHT_PASS: internal asset bytes, signatures, page scope and registry synchronization are consistent.');
