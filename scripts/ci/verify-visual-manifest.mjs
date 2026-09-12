// Deterministic invariant checks for the Amanda OS VISUAL asset manifest
// contract (docs/automation/VISUAL_ASSET_MANIFEST_V1_1.md, Goal
// HEALTH-VISUAL-PILOT-001 and successors). Every check below corresponds to
// a named check in the authoritative Goal Issue's required implementation
// order (manifest-schema, manifest-required-fields, approved-asset-existence,
// approved-asset-hashes, approved-asset-only, no-external-visuals,
// no-unapproved-generation, asset-naming-version).
//
// This script has no dependency beyond Node's standard library so it can run
// unmodified in required-build-gate.yml alongside the other deterministic
// policy checks.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const PAGES_ROOT = path.join(REPO_ROOT, 'apps/health-web/src/assets/pages');

// Goal IDs this repository currently governs through the VISUAL manifest
// contract. Extend only when a new Amanda OS Goal Issue approves a new
// page/version under this system — never invent one.
const KNOWN_GOAL_IDS = new Set(['HEALTH-VISUAL-PILOT-001']);

const STATUSES = new Set(['PENDING_OWNER_ASSET', 'APPROVED', 'SUPERSEDED', 'REJECTED']);
const ASSET_ROLES = new Set(['source', 'web', 'mobile']);
const SHA256_RE = /^[a-f0-9]{64}$/;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const SOURCE_SCAN_EXTENSIONS = new Set(['.tsx', '.ts', '.css']);

const violations = [];
function fail(check, message) {
  violations.push(`[${check}] ${message}`);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function toRepoRelative(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
}

function sha256Of(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

if (!fs.existsSync(PAGES_ROOT)) {
  console.log(`No ${toRepoRelative(PAGES_ROOT)} directory present — nothing to verify.`);
  process.exit(0);
}

const allFiles = walk(PAGES_ROOT);
const manifestFiles = allFiles.filter((f) => path.basename(f) === 'manifest.json');
const imageFiles = allFiles.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));

if (manifestFiles.length === 0) {
  fail('manifest-required-fields', `${toRepoRelative(PAGES_ROOT)} contains no manifest.json; every page/version directory under it must carry one.`);
}

// Track every asset path that some manifest claims, so approved-asset-only
// can flag production images that no manifest accounts for.
const claimedPaths = new Set();

for (const manifestPath of manifestFiles) {
  const relManifest = toRepoRelative(manifestPath);
  const versionDir = path.dirname(manifestPath);
  const pageDir = path.dirname(versionDir);
  const versionDirName = path.basename(versionDir);
  const pageDirName = path.basename(pageDir);

  let raw;
  try {
    raw = fs.readFileSync(manifestPath, 'utf8');
  } catch (error) {
    fail('manifest-schema', `${relManifest} could not be read: ${error.message}`);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    fail('manifest-schema', `${relManifest} is not valid JSON: ${error.message}`);
    continue;
  }

  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
    fail('manifest-schema', `${relManifest} must be a JSON object`);
    continue;
  }

  // manifest-required-fields — top-level contract.
  const requiredTopLevel = [
    'schema_version', 'goal_id', 'page', 'version', 'status',
    'owner_approval', 'approved_reference', 'assets',
    'implementation_restrictions', 'delivery_evidence', 'verification',
  ];
  for (const key of requiredTopLevel) {
    if (!Object.hasOwn(manifest, key)) {
      fail('manifest-required-fields', `${relManifest} is missing required field "${key}"`);
    }
  }
  if (violations.some((v) => v.startsWith('[manifest-required-fields]') && v.includes(relManifest))) {
    // Missing top-level fields make deeper checks meaningless for this file.
    continue;
  }

  if (manifest.schema_version !== '1.1') {
    fail('manifest-schema', `${relManifest} schema_version must be "1.1", found ${JSON.stringify(manifest.schema_version)}`);
  }

  // asset-naming-version — directory/manifest field agreement.
  if (!/^v[0-9]+$/.test(versionDirName)) {
    fail('asset-naming-version', `${relManifest} lives under a version directory "${versionDirName}" that does not match v<N>`);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(pageDirName)) {
    fail('asset-naming-version', `${relManifest} lives under a page directory "${pageDirName}" that does not match [a-z][a-z0-9-]*`);
  }
  if (manifest.page !== pageDirName) {
    fail('asset-naming-version', `${relManifest} field page=${JSON.stringify(manifest.page)} does not match its directory "${pageDirName}"`);
  }
  if (manifest.version !== versionDirName) {
    fail('asset-naming-version', `${relManifest} field version=${JSON.stringify(manifest.version)} does not match its directory "${versionDirName}"`);
  }

  // goal-id-match — must equal a Goal ID this repo currently governs.
  if (typeof manifest.goal_id !== 'string' || !KNOWN_GOAL_IDS.has(manifest.goal_id)) {
    fail('manifest-required-fields', `${relManifest} goal_id=${JSON.stringify(manifest.goal_id)} does not match a known authoritative Goal ID (${[...KNOWN_GOAL_IDS].join(', ')})`);
  }

  if (typeof manifest.status !== 'string' || !STATUSES.has(manifest.status)) {
    fail('manifest-required-fields', `${relManifest} status=${JSON.stringify(manifest.status)} is not one of ${[...STATUSES].join(', ')}`);
  }
  const status = manifest.status;

  // owner_approval shape.
  const ownerApproval = manifest.owner_approval || {};
  for (const key of ['approved', 'approved_by', 'approved_at', 'approval_record']) {
    if (!Object.hasOwn(ownerApproval, key)) {
      fail('manifest-required-fields', `${relManifest} owner_approval is missing "${key}"`);
    }
  }

  // delivery_evidence / verification shape (existence only — values are
  // populated by the Rex handoff / CI evidence steps, not authored by hand).
  const deliveryEvidence = manifest.delivery_evidence || {};
  for (const key of ['pr_url', 'pr_head_sha', 'ci_tested_sha', 'manifest_commit_sha', 'vercel_preview_url', 'vercel_preview_sha']) {
    if (!Object.hasOwn(deliveryEvidence, key)) {
      fail('manifest-required-fields', `${relManifest} delivery_evidence is missing "${key}"`);
    }
  }
  const verification = manifest.verification || {};
  for (const key of ['visual_desktop', 'visual_mobile', 'last_verified_at']) {
    if (!Object.hasOwn(verification, key)) {
      fail('manifest-required-fields', `${relManifest} verification is missing "${key}"`);
    }
  }

  if (!Array.isArray(manifest.implementation_restrictions) || manifest.implementation_restrictions.length === 0) {
    fail('manifest-required-fields', `${relManifest} implementation_restrictions must be a non-empty array`);
  }

  // approved_reference — approved-asset-existence / approved-asset-hashes.
  const approvedReference = manifest.approved_reference || {};
  if (typeof approvedReference.path !== 'string' || !approvedReference.path) {
    fail('manifest-required-fields', `${relManifest} approved_reference.path must be a non-empty string`);
  } else {
    const refAbs = path.join(REPO_ROOT, approvedReference.path);
    const refExists = fs.existsSync(refAbs);
    claimedPaths.add(path.normalize(refAbs));

    if (approvedReference.sha256 !== null) {
      if (typeof approvedReference.sha256 !== 'string' || !SHA256_RE.test(approvedReference.sha256)) {
        fail('manifest-schema', `${relManifest} approved_reference.sha256 must be null or a 64-hex-char sha256 digest`);
      } else if (!refExists) {
        fail('approved-asset-existence', `${relManifest} approved_reference.path "${approvedReference.path}" does not exist but a sha256 is recorded`);
      } else {
        const actual = sha256Of(refAbs);
        if (actual !== approvedReference.sha256) {
          fail('approved-asset-hashes', `${relManifest} approved_reference sha256 mismatch: recorded ${approvedReference.sha256}, actual ${actual}`);
        }
      }
    } else if (status === 'APPROVED') {
      fail('approved-asset-hashes', `${relManifest} status is APPROVED but approved_reference.sha256 is null`);
    }
  }

  if (status === 'APPROVED' && (!ownerApproval.approved || !ownerApproval.approval_record)) {
    fail('no-unapproved-generation', `${relManifest} status is APPROVED but owner_approval.approved/approval_record is not recorded`);
  }

  // assets[] — approved-asset-existence / approved-asset-hashes / no-unapproved-generation.
  if (!Array.isArray(manifest.assets)) {
    fail('manifest-required-fields', `${relManifest} assets must be an array`);
  } else {
    if (status === 'APPROVED' && manifest.assets.length === 0) {
      fail('manifest-required-fields', `${relManifest} status is APPROVED but assets is empty`);
    }
    for (const [index, asset] of manifest.assets.entries()) {
      const label = `${relManifest} assets[${index}]`;
      if (!asset || typeof asset !== 'object') {
        fail('manifest-required-fields', `${label} must be an object`);
        continue;
      }
      for (const key of ['role', 'path', 'sha256', 'owner_approved', 'approval_record']) {
        if (!Object.hasOwn(asset, key)) fail('manifest-required-fields', `${label} is missing "${key}"`);
      }
      if (typeof asset.role !== 'string' || !ASSET_ROLES.has(asset.role)) {
        fail('manifest-required-fields', `${label} role=${JSON.stringify(asset.role)} must be one of ${[...ASSET_ROLES].join(', ')}`);
      }
      if (asset.owner_approved !== true || typeof asset.approval_record !== 'string' || !asset.approval_record) {
        fail('no-unapproved-generation', `${label} must have owner_approved=true and a non-empty approval_record before it may be used as a production visual`);
      }
      if (typeof asset.path !== 'string' || !asset.path) {
        fail('manifest-required-fields', `${label}.path must be a non-empty string`);
        continue;
      }
      const assetAbs = path.join(REPO_ROOT, asset.path);
      claimedPaths.add(path.normalize(assetAbs));
      if (typeof asset.sha256 !== 'string' || !SHA256_RE.test(asset.sha256)) {
        fail('manifest-schema', `${label}.sha256 must be a 64-hex-char sha256 digest`);
        continue;
      }
      if (!fs.existsSync(assetAbs)) {
        fail('approved-asset-existence', `${label}.path "${asset.path}" does not exist`);
        continue;
      }
      const actual = sha256Of(assetAbs);
      if (actual !== asset.sha256) {
        fail('approved-asset-hashes', `${label} sha256 mismatch: recorded ${asset.sha256}, actual ${actual}`);
      }
    }
  }

  // approved-asset-only — every image file under this page/version directory
  // must live at an approved root: directly as the approved reference, or
  // under source/, web/, mobile/.
  const versionImages = imageFiles.filter((f) => f.startsWith(versionDir + path.sep));
  for (const imgAbs of versionImages) {
    const relToVersion = path.relative(versionDir, imgAbs);
    const topSegment = relToVersion.split(path.sep)[0];
    const isReferenceFile = path.dirname(imgAbs) === versionDir;
    const isApprovedSubdir = ['source', 'web', 'mobile'].includes(topSegment) && path.dirname(imgAbs) !== versionDir;
    if (!isReferenceFile && !isApprovedSubdir) {
      fail('approved-asset-only', `${toRepoRelative(imgAbs)} is not under an approved root (page/version root file, or source/, web/, mobile/)`);
    }
  }
}

// approved-asset-only (repo-wide half): every image file physically present
// under apps/health-web/src/assets/pages must be claimed by some manifest.
for (const imgAbs of imageFiles) {
  const normalized = path.normalize(imgAbs);
  if (!claimedPaths.has(normalized)) {
    fail('approved-asset-only', `${toRepoRelative(imgAbs)} exists under apps/health-web/src/assets/pages but is not listed in any manifest.json`);
  }
}

// no-external-visuals — no production source under apps/health-web/src may
// reference a remote http(s) image URL.
const healthWebSrc = path.join(REPO_ROOT, 'apps/health-web/src');
if (fs.existsSync(healthWebSrc)) {
  const sourceFiles = walk(healthWebSrc).filter((f) => SOURCE_SCAN_EXTENSIONS.has(path.extname(f).toLowerCase()));
  const externalImagePattern = /(?:src\s*=\s*["'`]https?:\/\/|url\(\s*['"]?https?:\/\/)/i;
  for (const filePath of sourceFiles) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (externalImagePattern.test(line)) {
        fail('no-external-visuals', `${toRepoRelative(filePath)}:${i + 1} references an external http(s) image URL`);
      }
    });
  }
}

if (violations.length) {
  console.error('VISUAL asset manifest invariant violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`VISUAL asset manifest invariants: PASS (${manifestFiles.length} manifest(s) checked, ${imageFiles.length} governed image file(s) verified)`);
