// Deterministic invariant checks for the Amanda OS VISUAL asset manifest
// contract (docs/automation/VISUAL_ASSET_MANIFEST_V1_1.md, Goal
// HEALTH-VISUAL-PILOT-001 and successors). Every check below corresponds to
// a named check in the authoritative Goal Issue's required implementation
// order (manifest-schema, manifest-required-fields, approved-asset-existence,
// approved-asset-hashes, approved-asset-only, no-external-visuals,
// no-unapproved-generation, asset-naming-version, approved-evidence-complete).
//
// This script has no dependency beyond Node's standard library so it can run
// unmodified in required-build-gate.yml alongside the other deterministic
// policy checks (wired in via the root `npm run build` -> `verify:visual-manifest`
// script, since this automation identity's GitHub App installation cannot
// push edits to .github/workflows/*.yml).
//
// verifyManifests() is exported so scripts/ci/verify-visual-manifest.test.mjs
// can exercise positive/negative fixtures without shelling out.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Goal IDs this repository currently governs through the VISUAL manifest
// contract. Extend only when a new Amanda OS Goal Issue approves a new
// page/version under this system — never invent one.
const KNOWN_GOAL_IDS = new Set(['HEALTH-VISUAL-PILOT-001']);

const STATUSES = new Set(['PENDING_OWNER_ASSET', 'APPROVED', 'SUPERSEDED', 'REJECTED']);
const ASSET_ROLES = new Set(['source', 'web', 'mobile']);
const SHA256_RE = /^[a-f0-9]{64}$/;
const GIT_SHA_RE = /^[a-f0-9]{40}$/;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const SOURCE_SCAN_EXTENSIONS = new Set(['.tsx', '.ts', '.css']);

// Images that predate this contract (see docs/automation/VISUAL_ASSET_MANIFEST_V1_1.md
// "Layout" note). Grandfathered explicitly by repo-relative path so any *other*
// image added anywhere under apps/health-web/src/assets that is not manifest-listed
// is a hard failure, not a silent pass — closing the gap where production code
// could import an unmanifested local image outside src/assets/pages.
const GRANDFATHERED_IMAGE_PATHS = new Set([
  'apps/health-web/src/assets/brand/asclepios-mark.webp',
  'apps/health-web/src/assets/hero/health-hero-sunrise.webp',
]);

// ---- Minimal Draft-07-subset JSON Schema evaluator -------------------------
// Supports exactly the keywords manifest.schema.json uses: type (incl. arrays
// of types), const, enum, pattern, minLength, minItems, required,
// additionalProperties, properties, items. This is not a general-purpose
// validator — it exists so the manifest is actually checked against the
// checked-in schema file instead of a hand-rolled duplicate of it.
function validateAgainstSchema(schema, value, pointer, violations) {
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (!types.includes(actual)) {
      violations.push(`[manifest-schema] ${pointer} must be type ${types.join('|')}, found ${actual}`);
      return;
    }
  }
  if (Object.hasOwn(schema, 'const') && value !== schema.const) {
    violations.push(`[manifest-schema] ${pointer} must equal ${JSON.stringify(schema.const)}, found ${JSON.stringify(value)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    violations.push(`[manifest-schema] ${pointer} must be one of ${JSON.stringify(schema.enum)}, found ${JSON.stringify(value)}`);
  }
  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      violations.push(`[manifest-schema] ${pointer} must match pattern ${schema.pattern}, found ${JSON.stringify(value)}`);
    }
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      violations.push(`[manifest-schema] ${pointer} must have length >= ${schema.minLength}`);
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      violations.push(`[manifest-schema] ${pointer} must have >= ${schema.minItems} item(s)`);
    }
    if (schema.items) {
      value.forEach((item, i) => validateAgainstSchema(schema.items, item, `${pointer}[${i}]`, violations));
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key)) {
        violations.push(`[manifest-schema] ${pointer} is missing required property "${key}"`);
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          violations.push(`[manifest-schema] ${pointer} has undeclared property "${key}"`);
        }
      }
    }
    for (const [key, subSchema] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) {
        validateAgainstSchema(subSchema, value[key], `${pointer}.${key}`, violations);
      }
    }
  }
}

// ---- Path confinement -------------------------------------------------------
// Rejects absolute paths and any path that normalizes outside of `confineTo`
// (a repo-relative directory the path must live under). This is what stops a
// manifest from pointing approved_reference/assets at an arbitrary file
// elsewhere in (or outside) the repo via `../` traversal.
function isConfinedTo(repoRelativePath, confineToRepoRelativeDir) {
  if (path.isAbsolute(repoRelativePath)) return false;
  const normalized = path.normalize(repoRelativePath);
  if (normalized.split(path.sep).includes('..')) return false;
  const confineNormalized = path.normalize(confineToRepoRelativeDir) + path.sep;
  return (normalized + path.sep).startsWith(confineNormalized);
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

function sha256Of(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

// Magic-byte signatures for the raster formats this contract allows. A file
// can have a matching sha256 and the right extension while still being a
// corrupt or placeholder blob (e.g. random bytes saved as ".png") -- a real
// case flagged against this Goal's own asset pipeline, where a committed
// "approved-home-reference.png" did not carry the PNG signature at all. This
// closes that gap deterministically instead of trusting the file extension.
const IMAGE_SIGNATURES = {
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
};

function hasValidImageSignature(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (ext === '.svg') {
    const head = fs.readFileSync(absPath, 'utf8').slice(0, 512).trimStart();
    return head.startsWith('<?xml') || head.startsWith('<svg');
  }
  const buf = fs.readFileSync(absPath);
  if (ext === '.webp') {
    return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  }
  const sigs = IMAGE_SIGNATURES[ext];
  if (!sigs) return true; // no known signature for this extension -- nothing to check
  return sigs.some((sig) => buf.length >= sig.length && sig.every((byte, i) => buf[i] === byte));
}

export function verifyManifests(repoRoot) {
  const violations = [];
  const fail = (check, message) => violations.push(`[${check}] ${message}`);
  const toRepoRelative = (absPath) => path.relative(repoRoot, absPath).split(path.sep).join('/');

  const pagesRoot = path.join(repoRoot, 'apps/health-web/src/assets/pages');
  const schemaPath = path.join(pagesRoot, 'manifest.schema.json');

  if (!fs.existsSync(pagesRoot)) {
    return { violations, manifestCount: 0, imageCount: 0, message: `No ${toRepoRelative(pagesRoot)} directory present — nothing to verify.` };
  }

  let schema = null;
  if (fs.existsSync(schemaPath)) {
    try {
      schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    } catch (error) {
      fail('manifest-schema', `${toRepoRelative(schemaPath)} is not valid JSON: ${error.message}`);
    }
  }

  const allFiles = walk(pagesRoot);
  const manifestFiles = allFiles.filter((f) => path.basename(f) === 'manifest.json');
  const imageFilesUnderPages = allFiles.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));

  if (manifestFiles.length === 0) {
    fail('manifest-required-fields', `${toRepoRelative(pagesRoot)} contains no manifest.json; every page/version directory under it must carry one.`);
  }

  // Track every asset path some manifest claims, so approved-asset-only can
  // flag production images that no manifest accounts for.
  const claimedPaths = new Set();

  for (const manifestPath of manifestFiles) {
    const relManifest = toRepoRelative(manifestPath);
    const versionDir = path.dirname(manifestPath);
    const pageDir = path.dirname(versionDir);
    const versionDirName = path.basename(versionDir);
    const pageDirName = path.basename(pageDir);
    const versionDirRel = toRepoRelative(versionDir);

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

    // Evaluate the manifest against the real checked-in JSON Schema, not a
    // hand-rolled duplicate of its rules.
    if (schema) {
      const before = violations.length;
      validateAgainstSchema(schema, manifest, relManifest, violations);
      if (violations.length > before) continue; // deeper checks meaningless if schema-invalid
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
    const ownerApproval = manifest.owner_approval || {};

    // approved_reference — approved-asset-existence / approved-asset-hashes /
    // path confinement (must live at the version-dir root, not a subdirectory,
    // and must not escape that directory via traversal).
    const approvedReference = manifest.approved_reference || {};
    if (typeof approvedReference.path === 'string' && approvedReference.path) {
      const refAbs = path.join(repoRoot, approvedReference.path);
      claimedPaths.add(path.normalize(refAbs));

      if (!isConfinedTo(approvedReference.path, versionDirRel)) {
        fail('approved-asset-only', `${relManifest} approved_reference.path "${approvedReference.path}" is not confined to ${versionDirRel}/`);
      } else if (path.dirname(approvedReference.path) !== versionDirRel) {
        fail('approved-asset-only', `${relManifest} approved_reference.path "${approvedReference.path}" must live directly in ${versionDirRel}/, not a subdirectory`);
      }

      const refExists = fs.existsSync(refAbs);
      if (approvedReference.sha256 !== null) {
        if (!refExists) {
          fail('approved-asset-existence', `${relManifest} approved_reference.path "${approvedReference.path}" does not exist but a sha256 is recorded`);
        } else {
          const actual = sha256Of(refAbs);
          if (actual !== approvedReference.sha256) {
            fail('approved-asset-hashes', `${relManifest} approved_reference sha256 mismatch: recorded ${approvedReference.sha256}, actual ${actual}`);
          } else if (!hasValidImageSignature(refAbs)) {
            fail('approved-asset-hashes', `${relManifest} approved_reference.path "${approvedReference.path}" does not have a valid image file signature -- it is a corrupt or placeholder blob, not real image content`);
          }
        }
      } else if (status === 'APPROVED') {
        fail('approved-asset-hashes', `${relManifest} status is APPROVED but approved_reference.sha256 is null`);
      }
    }

    if (status === 'APPROVED' && (!ownerApproval.approved || !ownerApproval.approval_record)) {
      fail('no-unapproved-generation', `${relManifest} status is APPROVED but owner_approval.approved/approval_record is not recorded`);
    }

    // assets[] — approved-asset-existence / approved-asset-hashes /
    // no-unapproved-generation / path confinement to <version>/<role>/.
    if (Array.isArray(manifest.assets)) {
      if (status === 'APPROVED' && manifest.assets.length === 0) {
        fail('manifest-required-fields', `${relManifest} status is APPROVED but assets is empty`);
      }
      for (const [index, asset] of manifest.assets.entries()) {
        const label = `${relManifest} assets[${index}]`;
        if (!asset || typeof asset !== 'object') continue;

        if (asset.owner_approved !== true || typeof asset.approval_record !== 'string' || !asset.approval_record) {
          fail('no-unapproved-generation', `${label} must have owner_approved=true and a non-empty approval_record before it may be used as a production visual`);
        }
        if (typeof asset.path !== 'string' || !asset.path) continue;

        const expectedRoleDir = ASSET_ROLES.has(asset.role) ? `${versionDirRel}/${asset.role}` : null;
        if (!isConfinedTo(asset.path, versionDirRel)) {
          fail('approved-asset-only', `${label}.path "${asset.path}" is not confined to ${versionDirRel}/`);
          continue;
        }
        if (expectedRoleDir && !isConfinedTo(asset.path, expectedRoleDir)) {
          fail('approved-asset-only', `${label}.path "${asset.path}" must live under ${expectedRoleDir}/ to match its declared role "${asset.role}"`);
        }

        const assetAbs = path.join(repoRoot, asset.path);
        claimedPaths.add(path.normalize(assetAbs));
        if (typeof asset.sha256 !== 'string' || !SHA256_RE.test(asset.sha256)) continue;
        if (!fs.existsSync(assetAbs)) {
          fail('approved-asset-existence', `${label}.path "${asset.path}" does not exist`);
          continue;
        }
        const actual = sha256Of(assetAbs);
        if (actual !== asset.sha256) {
          fail('approved-asset-hashes', `${label} sha256 mismatch: recorded ${asset.sha256}, actual ${actual}`);
        } else if (!hasValidImageSignature(assetAbs)) {
          fail('approved-asset-hashes', `${label}.path "${asset.path}" does not have a valid image file signature -- it is a corrupt or placeholder blob, not real image content`);
        }
      }
    }

    // approved-evidence-complete — an APPROVED manifest must carry real,
    // non-null delivery evidence and PASS visual verification. Without this,
    // a manifest could flip to APPROVED while every SHA/URL stays null and
    // desktop/mobile checks stay NOT_RUN, which is exactly the gap that lets
    // "green CI" masquerade as a verified, deployed, owner-approved page.
    if (status === 'APPROVED') {
      const evidence = manifest.delivery_evidence || {};
      for (const key of ['pr_url', 'pr_head_sha', 'ci_tested_sha', 'manifest_commit_sha', 'vercel_preview_url', 'vercel_preview_sha']) {
        if (typeof evidence[key] !== 'string' || !evidence[key]) {
          fail('approved-evidence-complete', `${relManifest} status is APPROVED but delivery_evidence.${key} is not a recorded value`);
        }
      }
      // SHA-shaped fields must actually look like a git commit SHA, not just
      // any non-empty string.
      for (const key of ['pr_head_sha', 'ci_tested_sha', 'manifest_commit_sha', 'vercel_preview_sha']) {
        const value = evidence[key];
        if (typeof value === 'string' && value && !GIT_SHA_RE.test(value)) {
          fail('approved-evidence-complete', `${relManifest} delivery_evidence.${key} "${value}" is not a 40-character git commit SHA`);
        }
      }
      // pr_head_sha/ci_tested_sha/vercel_preview_sha describe the one commit
      // that was tested and deployed, so they must agree with each other.
      // manifest_commit_sha is deliberately excluded from this equality set:
      // it names the commit that finalized this manifest's approved content,
      // which is necessarily an earlier, already-existing commit recorded by
      // a later evidence-only commit -- requiring it to equal the current PR
      // head would make the field self-referential (a commit cannot contain
      // its own resulting hash) and impossible to complete honestly.
      const evidenceShas = [evidence.pr_head_sha, evidence.ci_tested_sha, evidence.vercel_preview_sha]
        .filter((v) => typeof v === 'string' && v);
      if (evidenceShas.length > 1 && new Set(evidenceShas).size > 1) {
        fail('approved-evidence-complete', `${relManifest} status is APPROVED but delivery_evidence SHAs disagree: ${JSON.stringify(evidence)}`);
      }
      const assetRoles = new Set((Array.isArray(manifest.assets) ? manifest.assets : []).map((a) => a && a.role));
      for (const role of ASSET_ROLES) {
        if (!assetRoles.has(role)) {
          fail('approved-evidence-complete', `${relManifest} status is APPROVED but assets[] has no "${role}" derivative`);
        }
      }
      const verification = manifest.verification || {};
      if (verification.visual_desktop !== 'PASS') {
        fail('approved-evidence-complete', `${relManifest} status is APPROVED but verification.visual_desktop is ${JSON.stringify(verification.visual_desktop)}, not PASS`);
      }
      if (verification.visual_mobile !== 'PASS') {
        fail('approved-evidence-complete', `${relManifest} status is APPROVED but verification.visual_mobile is ${JSON.stringify(verification.visual_mobile)}, not PASS`);
      }
      if (!verification.last_verified_at) {
        fail('approved-evidence-complete', `${relManifest} status is APPROVED but verification.last_verified_at is not recorded`);
      }
    }
  }

  // approved-asset-only (pages-root half): every image file physically
  // present under apps/health-web/src/assets/pages must be claimed by some
  // manifest.
  for (const imgAbs of imageFilesUnderPages) {
    if (!claimedPaths.has(path.normalize(imgAbs))) {
      fail('approved-asset-only', `${toRepoRelative(imgAbs)} exists under apps/health-web/src/assets/pages but is not listed in any manifest.json`);
    }
  }

  // approved-asset-only (repo-wide half): any image anywhere under
  // apps/health-web/src/assets is either claimed by a manifest, under the
  // manifest-governed pages/ root, or on the explicit pre-contract
  // grandfather list — anything else is an unmanifested visual that bypassed
  // the contract entirely.
  const healthAssetsRoot = path.join(repoRoot, 'apps/health-web/src/assets');
  let allImageCount = imageFilesUnderPages.length;
  if (fs.existsSync(healthAssetsRoot)) {
    const allAssetFiles = walk(healthAssetsRoot);
    const allImages = allAssetFiles.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
    allImageCount = allImages.length;
    for (const imgAbs of allImages) {
      const rel = toRepoRelative(imgAbs);
      if (rel.startsWith('apps/health-web/src/assets/pages/')) continue; // already checked above
      if (GRANDFATHERED_IMAGE_PATHS.has(rel)) continue;
      fail('approved-asset-only', `${rel} is an unmanifested image under apps/health-web/src/assets that is neither pages/-governed nor grandfathered`);
    }
  }

  // no-external-visuals — no production source under apps/health-web/src may
  // reference a remote http(s) image URL.
  const healthWebSrc = path.join(repoRoot, 'apps/health-web/src');
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

  return { violations, manifestCount: manifestFiles.length, imageCount: allImageCount };
}

function main() {
  const repoRoot = process.cwd();
  const result = verifyManifests(repoRoot);
  if (result.message) {
    console.log(result.message);
    return 0;
  }
  if (result.violations.length) {
    console.error('VISUAL asset manifest invariant violations:');
    for (const violation of result.violations) console.error(`- ${violation}`);
    return 1;
  }
  console.log(`VISUAL asset manifest invariants: PASS (${result.manifestCount} manifest(s) checked, ${result.imageCount} governed image file(s) verified)`);
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  process.exit(main());
}
