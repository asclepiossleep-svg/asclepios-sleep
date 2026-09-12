import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { verifyManifests } from './verify-visual-manifest.mjs';

const SCHEMA_PATH = path.join(process.cwd(), 'apps/health-web/src/assets/pages/manifest.schema.json');
const SCHEMA_RAW = fs.readFileSync(SCHEMA_PATH, 'utf8');

function baseManifest(overrides = {}) {
  return {
    schema_version: '1.1',
    goal_id: 'HEALTH-VISUAL-PILOT-001',
    page: 'home',
    version: 'v1',
    status: 'PENDING_OWNER_ASSET',
    owner_approval: { approved: false, approved_by: null, approved_at: null, approval_record: null },
    approved_reference: { path: 'apps/health-web/src/assets/pages/home/v1/approved-home-reference.png', sha256: null },
    assets: [],
    implementation_restrictions: ['no invented assets'],
    delivery_evidence: {
      pr_url: null, pr_head_sha: null, ci_tested_sha: null,
      manifest_commit_sha: null, vercel_preview_url: null, vercel_preview_sha: null,
    },
    verification: { visual_desktop: 'NOT_RUN', visual_mobile: 'NOT_RUN', last_verified_at: null },
    ...overrides,
  };
}

function makeFixtureRepo(manifest) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-manifest-fixture-'));
  const pagesRoot = path.join(repoRoot, 'apps/health-web/src/assets/pages');
  const versionDir = path.join(pagesRoot, 'home/v1');
  fs.mkdirSync(versionDir, { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'apps/health-web/src'), { recursive: true });
  fs.writeFileSync(path.join(pagesRoot, 'manifest.schema.json'), SCHEMA_RAW);
  fs.writeFileSync(path.join(versionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { repoRoot, versionDir };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function writePngFixture(absPath) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const bytes = Buffer.concat([PNG_SIGNATURE, crypto.randomBytes(64)]);
  fs.writeFileSync(absPath, bytes);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

test('a clean PENDING_OWNER_ASSET manifest passes with zero violations', () => {
  const { repoRoot } = makeFixtureRepo(baseManifest());
  const result = verifyManifests(repoRoot);
  assert.deepEqual(result.violations, []);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('schema violation: wrong schema_version is caught by real JSON Schema evaluation', () => {
  const { repoRoot } = makeFixtureRepo(baseManifest({ schema_version: '2.0' }));
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('manifest-schema') && v.includes('schema_version')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('schema violation: undeclared top-level property is rejected (additionalProperties: false)', () => {
  const { repoRoot } = makeFixtureRepo(baseManifest({ unexpected_field: 'nope' }));
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('undeclared property')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('path traversal in approved_reference.path is rejected, not silently accepted', () => {
  const manifest = baseManifest({
    approved_reference: { path: 'apps/health-web/src/assets/pages/home/v1/../../../../etc/passwd', sha256: null },
  });
  const { repoRoot } = makeFixtureRepo(manifest);
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('approved-asset-only') && v.includes('confined')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('asset path outside its declared role directory is rejected', () => {
  const manifest = baseManifest({
    assets: [{
      role: 'web',
      path: 'apps/health-web/src/assets/pages/home/v1/mobile/sneaked-in.png',
      sha256: 'a'.repeat(64),
      owner_approved: true,
      approval_record: 'issue-114-comment-1',
    }],
  });
  const { repoRoot, versionDir } = makeFixtureRepo(manifest);
  writePngFixture(path.join(versionDir, 'mobile/sneaked-in.png'));
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('must live under') && v.includes('/web/')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('a reference file whose bytes are not a real PNG is rejected even when its sha256 matches', () => {
  const garbage = crypto.randomBytes(64); // no PNG magic-byte signature
  const garbageSha = crypto.createHash('sha256').update(garbage).digest('hex');
  const manifest = baseManifest({
    approved_reference: { path: 'apps/health-web/src/assets/pages/home/v1/approved-home-reference.png', sha256: garbageSha },
  });
  const { repoRoot, versionDir } = makeFixtureRepo(manifest);
  fs.writeFileSync(path.join(versionDir, 'approved-home-reference.png'), garbage);
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('approved-asset-hashes') && v.includes('valid image file signature')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('APPROVED status with null delivery_evidence and NOT_RUN verification is rejected', () => {
  const manifest = baseManifest({ status: 'APPROVED', owner_approval: { approved: true, approved_by: 'edmund', approved_at: '2026-09-12T00:00:00Z', approval_record: 'issue-114-comment-2' } });
  const { repoRoot } = makeFixtureRepo(manifest);
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('approved-evidence-complete')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

function completeApprovedManifest(versionDir, overrides = {}) {
  const refSha = writePngFixture(path.join(versionDir, 'approved-home-reference.png'));
  const sourceSha = writePngFixture(path.join(versionDir, 'source/home-source.png'));
  const webSha = writePngFixture(path.join(versionDir, 'web/home-web.png'));
  const mobileSha = writePngFixture(path.join(versionDir, 'mobile/home-mobile.png'));
  return baseManifest({
    status: 'APPROVED',
    owner_approval: { approved: true, approved_by: 'edmund', approved_at: '2026-09-12T00:00:00Z', approval_record: 'issue-114-comment-3' },
    approved_reference: { path: 'apps/health-web/src/assets/pages/home/v1/approved-home-reference.png', sha256: refSha },
    assets: [
      {
        role: 'source',
        path: 'apps/health-web/src/assets/pages/home/v1/source/home-source.png',
        sha256: sourceSha,
        owner_approved: true,
        approval_record: 'issue-114-comment-3',
      },
      {
        role: 'web',
        path: 'apps/health-web/src/assets/pages/home/v1/web/home-web.png',
        sha256: webSha,
        owner_approved: true,
        approval_record: 'issue-114-comment-3',
      },
      {
        role: 'mobile',
        path: 'apps/health-web/src/assets/pages/home/v1/mobile/home-mobile.png',
        sha256: mobileSha,
        owner_approved: true,
        approval_record: 'issue-114-comment-3',
      },
    ],
    delivery_evidence: {
      pr_url: 'https://github.com/asclepiossleep-svg/asclepios-sleep/pull/115',
      // manifest_commit_sha intentionally differs from the other three: it
      // names the earlier commit that finalized this content, recorded by a
      // later evidence-only commit -- see the comment in verify-visual-manifest.mjs.
      pr_head_sha: 'a'.repeat(40),
      ci_tested_sha: 'a'.repeat(40),
      manifest_commit_sha: 'b'.repeat(40),
      vercel_preview_url: 'https://example.vercel.app',
      vercel_preview_sha: 'a'.repeat(40),
    },
    verification: { visual_desktop: 'PASS', visual_mobile: 'PASS', last_verified_at: '2026-09-12T00:00:00Z' },
    ...overrides,
  });
}

test('a fully complete APPROVED manifest with real assets on disk passes, even though manifest_commit_sha differs from the tested/deployed SHA', () => {
  const { repoRoot, versionDir } = makeFixtureRepo(baseManifest());
  const manifest = completeApprovedManifest(versionDir);
  fs.writeFileSync(path.join(versionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const result = verifyManifests(repoRoot);
  assert.deepEqual(result.violations, []);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('APPROVED manifest missing a source/mobile derivative is rejected even with matching evidence', () => {
  const { repoRoot, versionDir } = makeFixtureRepo(baseManifest());
  const manifest = completeApprovedManifest(versionDir);
  manifest.assets = manifest.assets.filter((a) => a.role !== 'mobile');
  fs.writeFileSync(path.join(versionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('approved-evidence-complete') && v.includes('no "mobile" derivative')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('APPROVED manifest is rejected when pr_head_sha and vercel_preview_sha disagree', () => {
  const { repoRoot, versionDir } = makeFixtureRepo(baseManifest());
  const manifest = completeApprovedManifest(versionDir, {
    delivery_evidence: {
      pr_url: 'https://github.com/asclepiossleep-svg/asclepios-sleep/pull/115',
      pr_head_sha: 'a'.repeat(40),
      ci_tested_sha: 'a'.repeat(40),
      manifest_commit_sha: 'b'.repeat(40),
      vercel_preview_url: 'https://example.vercel.app',
      vercel_preview_sha: 'c'.repeat(40),
    },
  });
  fs.writeFileSync(path.join(versionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('approved-evidence-complete') && v.includes('disagree')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('APPROVED manifest with a malformed (non-hex) delivery SHA is rejected', () => {
  const { repoRoot, versionDir } = makeFixtureRepo(baseManifest());
  const manifest = completeApprovedManifest(versionDir, {
    delivery_evidence: {
      pr_url: 'https://github.com/asclepiossleep-svg/asclepios-sleep/pull/115',
      pr_head_sha: 'not-a-real-sha',
      ci_tested_sha: 'not-a-real-sha',
      manifest_commit_sha: 'b'.repeat(40),
      vercel_preview_url: 'https://example.vercel.app',
      vercel_preview_sha: 'not-a-real-sha',
    },
  });
  fs.writeFileSync(path.join(versionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('approved-evidence-complete') && v.includes('not a 40-character git commit SHA')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('an unmanifested image elsewhere under apps/health-web/src/assets is a hard failure', () => {
  const { repoRoot } = makeFixtureRepo(baseManifest());
  writePngFixture(path.join(repoRoot, 'apps/health-web/src/assets/sneaky/unlisted.png'));
  const result = verifyManifests(repoRoot);
  assert.ok(result.violations.some((v) => v.includes('unmanifested image') && v.includes('sneaky/unlisted.png')));
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test('grandfathered pre-contract images (brand mark, hero photo) do not trigger approved-asset-only', () => {
  const { repoRoot } = makeFixtureRepo(baseManifest());
  writePngFixture(path.join(repoRoot, 'apps/health-web/src/assets/brand/asclepios-mark.webp'));
  writePngFixture(path.join(repoRoot, 'apps/health-web/src/assets/hero/health-hero-sunrise.webp'));
  const result = verifyManifests(repoRoot);
  assert.deepEqual(result.violations, []);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});
