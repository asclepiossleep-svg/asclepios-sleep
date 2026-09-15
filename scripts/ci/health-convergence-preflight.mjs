import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const PAGE_MANIFEST = 'apps/health-web/src/assets/pages/home/v1/manifest.json';
const GLOBAL_REGISTRY = 'apps/health-web/asset-manifest.json';
const REPORT_PATH = 'artifacts/health-convergence-preflight.json';
const ACTIVE = new Set(['APPROVED', 'PUBLISHED']);

const findings = [];
const add = (asset, code, message, extra = {}) => findings.push({ asset, code, classification: 'INTERNAL_BLOCKED', retryable: false, message, ...extra });
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
  catch (error) { add(file, 'MANIFEST_READ_FAIL', `${file}: ${error.message}`); return null; }
}

async function verifyBinary(repoPath, expectedSha, label) {
  let buf;
  try { buf = await fs.readFile(repoPath); }
  catch {
    add(label, 'ASSET_MISSING', `${label}: missing ${repoPath}`, { repo_path: repoPath, expected_sha256: expectedSha });
    return;
  }
  const actual = sha256(buf);
  if (actual !== expectedSha) add(label, 'ASSET_SHA_MISMATCH', `${label}: SHA-256 mismatch`, { repo_path: repoPath, expected_sha256: expectedSha, actual_sha256: actual });
  if (!validSignature(repoPath, buf)) add(label, 'ASSET_INVALID_BINARY', `${label}: invalid ${path.extname(repoPath)} binary signature`, { repo_path: repoPath });
}

const page = await readJson(PAGE_MANIFEST);
const registry = await readJson(GLOBAL_REGISTRY);

if (page && registry) {
  if (page.goal_id !== 'HEALTH-VISUAL-PILOT-001' || page.page !== 'home' || page.version !== 'v1') {
    add('home-v1-manifest', 'GOAL_SCOPE_MISMATCH', 'Home v1 manifest Goal/page/version contract is invalid');
  }

  const pageDir = path.dirname(PAGE_MANIFEST);
  if (page.approved_reference?.path && page.approved_reference?.sha256) {
    await verifyBinary(path.resolve(pageDir, page.approved_reference.path), page.approved_reference.sha256, 'approved-home-reference');
  } else {
    add('approved-home-reference', 'REFERENCE_METADATA_MISSING', 'approved_reference path/SHA is missing');
  }

  const globalByPath = new Map((registry.assets || []).map((a) => [a.repo_path, a]));
  const requiredRoles = new Set(['hero','products_card','sleep_app_card','learning_card']);
  const seenRoles = new Set();

  for (const asset of page.assets || []) {
    seenRoles.add(asset.role);
    const label = asset.id || asset.role || 'asset';
    const absolute = path.resolve(pageDir, asset.path || '');
    const repoPath = path.relative(process.cwd(), absolute).split(path.sep).join('/');

    if (asset.owner_approved !== true) add(label, 'PAGE_ASSET_NOT_APPROVED', `${label}: owner_approved must be true`, { repo_path: repoPath });
    if (!asset.approval_record || !asset.provenance) add(label, 'PROVENANCE_MISSING', `${label}: approval_record and provenance are required`, { repo_path: repoPath });
    await verifyBinary(absolute, asset.sha256, label);

    const global = globalByPath.get(repoPath);
    if (!global) {
      add(label, 'REGISTRY_ENTRY_MISSING', `${label}: ${repoPath} is absent from global asset registry`, { repo_path: repoPath });
      continue;
    }
    if (!ACTIVE.has(global.status)) add(label, 'REGISTRY_STATUS_INVALID', `${label}: registry status ${global.status} is not production-active`, { asset_id: global.asset_id, repo_path: repoPath });
    if (!global.source_ref || !global.approved_by || !global.version) add(label, 'REGISTRY_PROVENANCE_MISSING', `${label}: global registry provenance fields are incomplete`, { asset_id: global.asset_id, repo_path: repoPath });
    if (global.checksum_sha256 !== asset.sha256) {
      add(label, 'REGISTRY_SHA_DIVERGENCE', `${label}: page manifest and global registry disagree on SHA-256`, {
        repo_path: repoPath,
        page_sha256: asset.sha256,
        registry_sha256: global.checksum_sha256,
      });
    }
  }

  for (const role of requiredRoles) if (!seenRoles.has(role)) add(`role:${role}`, 'PAGE_ROLE_MISSING', `Home v1 manifest missing required role: ${role}`);
}

const byAsset = new Map();
for (const finding of findings) {
  if (!byAsset.has(finding.asset)) byAsset.set(finding.asset, []);
  byAsset.get(finding.asset).push(finding);
}

const blockers = [...byAsset.entries()].map(([asset, issues]) => {
  const expectedSha = issues.find((i) => i.expected_sha256)?.expected_sha256 || null;
  const hasByteProblem = issues.some((i) => ['ASSET_SHA_MISMATCH','ASSET_INVALID_BINARY','ASSET_MISSING'].includes(i.code));
  const hasRegistryProblem = issues.some((i) => i.code.startsWith('REGISTRY_'));
  const remediation = hasByteProblem
    ? {
        action: 'RESTORE_EXACT_APPROVED_BYTES_OR_REVERSION_WITH_OWNER_APPROVAL',
        auto_retry: false,
        expected_sha256: expectedSha,
        rule: 'Do not relabel the checksum. Restore exact approved bytes, or create a new version and obtain Amanda/Owner approval before changing the canonical SHA.',
      }
    : hasRegistryProblem
      ? {
          action: 'SYNCHRONIZE_PAGE_MANIFEST_AND_GLOBAL_REGISTRY',
          auto_retry: false,
          expected_sha256: expectedSha,
          rule: 'One exact production file may have only one approved SHA truth across page manifest and global registry.',
        }
      : {
          action: 'FIX_DETERMINISTIC_METADATA_CONTRACT',
          auto_retry: false,
          expected_sha256: expectedSha,
          rule: 'Resolve the recorded metadata/provenance error before downstream work.',
        };
  return { asset, classification: 'INTERNAL_BLOCKED', retryable: false, issues, remediation };
});

const report = {
  schema_version: '1.1.0',
  goal_id: 'HEALTH-VISUAL-PILOT-001',
  pr: 116,
  page: 'home',
  version: 'v1',
  status: blockers.length ? 'INTERNAL_BLOCKED' : 'READY_FOR_BUILD',
  root_cause_count: blockers.length,
  finding_count: findings.length,
  can_run_build_browser_visual: blockers.length === 0,
  downstream_policy: blockers.length ? 'SKIP_BUILD_BROWSER_VISUAL_DEPLOYMENT' : 'ALLOW_INTERNAL_GATES',
  external_deployment: { status: 'NOT_EVALUATED', classification: 'EXTERNAL_DEPENDENCY', provider: 'Vercel' },
  blockers,
  findings,
};

await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`HEALTH_CONVERGENCE_PREFLIGHT=${JSON.stringify(report)}`);

if (blockers.length) {
  console.error(`HEALTH_CONVERGENCE_PREFLIGHT_BLOCKED: ${blockers.length} root-cause blocker(s), ${findings.length} finding(s).`);
  for (const b of blockers) {
    console.error(`- ${b.asset}: ${b.issues.map((i) => i.code).join(', ')} -> ${b.remediation.action}`);
  }
  process.exit(1);
}

console.log('HEALTH_CONVERGENCE_PREFLIGHT_PASS: internal asset bytes, signatures, provenance, page scope and registry synchronization are consistent.');
