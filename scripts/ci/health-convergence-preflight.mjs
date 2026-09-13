import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const PAGE_MANIFEST = 'apps/health-web/src/assets/pages/home/v1/manifest.json';
const GLOBAL_REGISTRY = 'apps/health-web/asset-manifest.json';
const REPORT_PATH = 'artifacts/health-convergence-preflight.json';
const ACTIVE = new Set(['APPROVED', 'PUBLISHED']);

const generalBlockers = [];
const assetBlockers = new Map();
const addGeneral = (code, message, extra = {}) => generalBlockers.push({
  code,
  classification: 'INTERNAL_BLOCKED',
  retryable: false,
  message,
  ...extra,
});
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function assetBlocker(repoPath, label, expectedSha) {
  if (!assetBlockers.has(repoPath)) {
    assetBlockers.set(repoPath, {
      code: 'ASSET_INTEGRITY_FAILURE',
      classification: 'INTERNAL_BLOCKED',
      retryable: false,
      asset: label,
      repo_path: repoPath,
      expected_sha256: expectedSha || null,
      actual_sha256: null,
      issues: [],
    });
  }
  return assetBlockers.get(repoPath);
}

function addAssetIssue(repoPath, label, expectedSha, issue, message, extra = {}) {
  const blocker = assetBlocker(repoPath, label, expectedSha);
  if (!blocker.issues.some((i) => i.code === issue)) blocker.issues.push({ code: issue, message, ...extra });
  if (extra.actual_sha256) blocker.actual_sha256 = extra.actual_sha256;
}

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
  catch (error) { addGeneral('MANIFEST_READ_FAIL', `${file}: ${error.message}`); return null; }
}

async function verifyBinary(repoPath, expectedSha, label) {
  let buf;
  try { buf = await fs.readFile(repoPath); }
  catch {
    addAssetIssue(repoPath, label, expectedSha, 'ASSET_MISSING', `missing ${repoPath}`);
    return;
  }
  const actual = sha256(buf);
  if (actual !== expectedSha) {
    addAssetIssue(repoPath, label, expectedSha, 'SHA_MISMATCH', 'committed bytes do not match approved SHA-256', { actual_sha256: actual });
  }
  if (!validSignature(repoPath, buf)) {
    addAssetIssue(repoPath, label, expectedSha, 'INVALID_BINARY_SIGNATURE', `invalid ${path.extname(repoPath)} binary signature`);
  }
}

const page = await readJson(PAGE_MANIFEST);
const registry = await readJson(GLOBAL_REGISTRY);

if (page && registry) {
  if (page.goal_id !== 'HEALTH-VISUAL-PILOT-001' || page.page !== 'home' || page.version !== 'v1') {
    addGeneral('GOAL_SCOPE_MISMATCH', 'Home v1 manifest Goal/page/version contract is invalid');
  }

  const pageDir = path.dirname(PAGE_MANIFEST);
  if (page.approved_reference?.path && page.approved_reference?.sha256) {
    await verifyBinary(path.resolve(pageDir, page.approved_reference.path), page.approved_reference.sha256, 'approved-home-reference');
  } else {
    addGeneral('REFERENCE_METADATA_MISSING', 'approved_reference path/SHA is missing');
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
      addAssetIssue(absolute, asset.id || asset.role || 'asset', asset.sha256, 'REGISTRY_ENTRY_MISSING', `${repoPath} is absent from global asset registry`);
      continue;
    }
    if (!ACTIVE.has(global.status)) {
      addAssetIssue(absolute, asset.id || asset.role || 'asset', asset.sha256, 'REGISTRY_STATUS_INVALID', `registry status ${global.status} is not production-active`, { asset_id: global.asset_id });
    }
    if (global.checksum_sha256 !== asset.sha256) {
      addAssetIssue(absolute, asset.id || asset.role || 'asset', asset.sha256, 'REGISTRY_SHA_DIVERGENCE', 'page manifest and global registry disagree on SHA-256', {
        page_sha256: asset.sha256,
        registry_sha256: global.checksum_sha256,
      });
    }
  }

  for (const role of requiredRoles) if (!seenRoles.has(role)) addGeneral('PAGE_ROLE_MISSING', `Home v1 manifest missing required role: ${role}`);
}

const blockers = [...generalBlockers, ...assetBlockers.values()];
const findingCount = blockers.reduce((sum, blocker) => sum + (Array.isArray(blocker.issues) ? blocker.issues.length : 1), 0);
const report = {
  schema_version: '1.1.0',
  goal_id: 'HEALTH-VISUAL-PILOT-001',
  pr: 116,
  page: 'home',
  version: 'v1',
  status: blockers.length ? 'INTERNAL_BLOCKED' : 'READY_FOR_BUILD',
  can_run_build_browser_visual: blockers.length === 0,
  root_cause_count: blockers.length,
  finding_count: findingCount,
  external_deployment: { status: 'NOT_EVALUATED', classification: 'EXTERNAL_DEPENDENCY', provider: 'Vercel' },
  blockers,
};

await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`HEALTH_CONVERGENCE_PREFLIGHT=${JSON.stringify(report)}`);

if (blockers.length) {
  console.error(`HEALTH_CONVERGENCE_PREFLIGHT_BLOCKED: ${blockers.length} root-cause blocker(s), ${findingCount} finding(s).`);
  for (const b of blockers) {
    if (Array.isArray(b.issues)) {
      console.error(`- ${b.asset}: ${b.issues.map((i) => i.code).join(', ')}`);
    } else {
      console.error(`- ${b.code}: ${b.message}`);
    }
  }
  process.exit(1);
}

console.log('HEALTH_CONVERGENCE_PREFLIGHT_PASS: internal asset bytes, signatures, page scope and registry synchronization are consistent.');
