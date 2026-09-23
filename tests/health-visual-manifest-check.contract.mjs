// Direct positive/negative contract tests for tests/health-visual-manifest-check.mjs.
//
// The script under test resolves its own repo root from process.cwd(), so each case here
// builds a throwaway fixture tree with the same relative layout as the real repo and spawns
// the real script against it -- exercising the exact code CI runs, not a re-implementation.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(repoRoot, 'tests/health-visual-manifest-check.mjs');
const APPROVAL = 'https://github.com/asclepiossleep-svg/asclepios-sleep/issues/114#issuecomment-0000000000';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_HEADER = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
const webp = (tag) => Buffer.concat([WEBP_HEADER, Buffer.from(tag)]);
const png = (tag) => Buffer.concat([PNG_BYTES, Buffer.from(tag)]);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function writeFile(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeJson(root, rel, obj) {
  writeFile(root, rel, `${JSON.stringify(obj, null, 2)}\n`);
}

function freshRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'health-visual-policy-'));
}

function writeV1Assets(root) {
  const bytes = {
    reference: png('v1-ref'),
    hero: webp('v1-hero'),
    products: webp('v1-products'),
    sleepApp: webp('v1-sleep-app'),
    learning: webp('v1-learning'),
  };
  writeFile(root, 'apps/health-web/src/assets/pages/home/v1/approved-home-reference.png', bytes.reference);
  writeFile(root, 'apps/health-web/src/assets/pages/home/v1/web/health-home-hero-v1.webp', bytes.hero);
  writeFile(root, 'apps/health-web/src/assets/pages/home/v1/web/health-home-products-card-v1.webp', bytes.products);
  writeFile(root, 'apps/health-web/src/assets/pages/home/v1/web/health-home-sleep-app-card-v1.webp', bytes.sleepApp);
  writeFile(root, 'apps/health-web/src/assets/pages/home/v1/web/health-home-learning-card-v1.webp', bytes.learning);
  return bytes;
}

function writeV1Manifest(root, bytes, overrides = {}) {
  const manifest = {
    schema_version: '1.2.0',
    goal_id: 'HEALTH-VISUAL-PILOT-001',
    page: 'home',
    version: 'v1',
    status: 'VERIFYING',
    owner_approval: { status: 'APPROVED', approval_record: APPROVAL },
    implementation: { external_urls_allowed: false, generated_substitutions_allowed: false },
    approved_reference: { path: './approved-home-reference.png', sha256: sha256(bytes.reference) },
    assets: [
      { id: 'home-hero', role: 'hero', path: './web/health-home-hero-v1.webp', version: 'v1', owner_approved: true, approval_record: APPROVAL, sha256: sha256(bytes.hero) },
      { id: 'home-products-card', role: 'products_card', path: './web/health-home-products-card-v1.webp', version: 'v1', owner_approved: true, approval_record: APPROVAL, sha256: sha256(bytes.products) },
      { id: 'home-sleep-app-card', role: 'sleep_app_card', path: './web/health-home-sleep-app-card-v1.webp', version: 'v1', owner_approved: true, approval_record: APPROVAL, sha256: sha256(bytes.sleepApp) },
      { id: 'home-learning-card', role: 'learning_card', path: './web/health-home-learning-card-v1.webp', version: 'v1', owner_approved: true, approval_record: APPROVAL, sha256: sha256(bytes.learning) },
    ],
    ...overrides,
  };
  writeJson(root, 'apps/health-web/src/assets/pages/home/v1/manifest.json', manifest);
  return manifest;
}

function writeV2Assets(root) {
  const bytes = { reference: png('v2-ref'), hero: webp('v2-hero'), products: webp('v2-products') };
  writeFile(root, 'apps/health-web/src/assets/pages/home/v2/approved-home-reference-v2.png', bytes.reference);
  writeFile(root, 'apps/health-web/src/assets/pages/home/v2/web/health-home-hero-v2.webp', bytes.hero);
  writeFile(root, 'apps/health-web/src/assets/pages/home/v2/web/health-home-products-card-v2.webp', bytes.products);
  return bytes;
}

function writeV2Manifest(root, v1Bytes, v2Bytes, overrides = {}) {
  const manifest = {
    schema_version: '1.2.0',
    goal_id: 'HEALTH-VISUAL-PILOT-001',
    page: 'home',
    version: 'v2',
    status: 'VERIFYING',
    owner_approval: { status: 'APPROVED', approval_record: APPROVAL },
    implementation: { external_urls_allowed: false, generated_substitutions_allowed: false },
    approved_reference: { path: './approved-home-reference-v2.png', sha256: sha256(v2Bytes.reference) },
    assets: [
      { id: 'home-hero-v2', role: 'hero', path: './web/health-home-hero-v2.webp', version: 'v2', owner_approved: true, approval_record: APPROVAL, sha256: sha256(v2Bytes.hero) },
      { id: 'home-products-card-v2', role: 'products_card', path: './web/health-home-products-card-v2.webp', version: 'v2', owner_approved: true, approval_record: APPROVAL, sha256: sha256(v2Bytes.products) },
      { id: 'home-sleep-app-card', role: 'sleep_app_card', path: '../v1/web/health-home-sleep-app-card-v1.webp', version: 'v1', owner_approved: true, approval_record: APPROVAL, sha256: sha256(v1Bytes.sleepApp) },
      { id: 'home-learning-card', role: 'learning_card', path: '../v1/web/health-home-learning-card-v1.webp', version: 'v1', owner_approved: true, approval_record: APPROVAL, sha256: sha256(v1Bytes.learning) },
    ],
    activation: { production_active: false },
    ...overrides,
  };
  writeJson(root, 'apps/health-web/src/assets/pages/home/v2/manifest.json', manifest);
  return manifest;
}

function homeTsxSource(activeVersion) {
  const heroImport = activeVersion === 'v2'
    ? '../assets/pages/home/v2/web/health-home-hero-v2.webp'
    : '../assets/pages/home/v1/web/health-home-hero-v1.webp';
  const productsImport = activeVersion === 'v2'
    ? '../assets/pages/home/v2/web/health-home-products-card-v2.webp'
    : '../assets/pages/home/v1/web/health-home-products-card-v1.webp';
  return `import heroPhoto from "${heroImport}";
import productsCardImage from "${productsImport}";
import sleepAppCardImage from "../assets/pages/home/v1/web/health-home-sleep-app-card-v1.webp";
import learningCardImage from "../assets/pages/home/v1/web/health-home-learning-card-v1.webp";
import "../styles/home.css";
import "../styles/home-approved-v1.css";

export default function Home() {
  return (
    <div>
      <img src={heroPhoto} alt="" />
      <img src={productsCardImage} alt="" />
      <img src={sleepAppCardImage} alt="" />
      <img src={learningCardImage} alt="" />
      <a>{t("health.hero.cta.products")}</a>
      <a>{t("health.hero.cta.sleepApp")}</a>
    </div>
  );
}
`;
}

function writeSupportFiles(root, homeVersion) {
  writeFile(root, 'apps/health-web/src/pages/Home.tsx', homeTsxSource(homeVersion));
  writeFile(root, 'apps/health-web/src/styles/home.css', '.health-site { color: black; }\n');
  writeFile(root, 'apps/health-web/src/styles/home-approved-v1.css', '.health-hero-photo { object-fit: cover; }\n');
  writeJson(root, 'apps/health-web/src/i18n/en.json', {
    'health.hero.title.line1': 'Better Sleep.',
    'health.hero.title.line2': 'Healthier Living.',
    'health.hero.cta.products': 'Explore Products',
    'health.hero.cta.sleepApp': 'Enter Sleep App',
  });
}

function runCheck(root) {
  return spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8' });
}

let passed = 0;
let failedCount = 0;
function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failedCount++;
    console.error(`FAIL: ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

// 1. v1 fallback (no v2 manifest exists at all) must pass.
{
  const root = freshRoot();
  const v1Bytes = writeV1Assets(root);
  writeV1Manifest(root, v1Bytes);
  writeSupportFiles(root, 'v1');
  const result = runCheck(root);
  check('v1 fallback (no v2 manifest) passes', result.status === 0 && /HEALTH_VISUAL_POLICY_PASS/.test(result.stdout) && /Home v1/.test(result.stdout), result.stdout + result.stderr);
  cleanup(root);
}

// 2. v1 fallback while an inactive v2 candidate manifest sits alongside it must still pass as v1.
{
  const root = freshRoot();
  const v1Bytes = writeV1Assets(root);
  writeV1Manifest(root, v1Bytes);
  const v2Bytes = writeV2Assets(root);
  writeV2Manifest(root, v1Bytes, v2Bytes, { activation: { production_active: false } });
  writeSupportFiles(root, 'v1');
  const result = runCheck(root);
  check('v1 fallback with inactive v2 candidate present passes as v1', result.status === 0 && /Home v1/.test(result.stdout), result.stdout + result.stderr);
  cleanup(root);
}

// 3. Active v2 (activation.production_active === true) must be validated as v2, not hardcoded v1.
{
  const root = freshRoot();
  const v1Bytes = writeV1Assets(root);
  writeV1Manifest(root, v1Bytes);
  const v2Bytes = writeV2Assets(root);
  writeV2Manifest(root, v1Bytes, v2Bytes, { activation: { production_active: true } });
  writeSupportFiles(root, 'v2');
  const result = runCheck(root);
  check('active v2 selection passes as v2', result.status === 0 && /HEALTH_VISUAL_POLICY_PASS/.test(result.stdout) && /Home v2/.test(result.stdout), result.stdout + result.stderr);
  cleanup(root);
}

// 4. Missing manifest (neither v1 nor v2 present) must fail cleanly.
{
  const root = freshRoot();
  writeSupportFiles(root, 'v1');
  const result = runCheck(root);
  check('missing manifest fails', result.status !== 0 && /Home v1 manifest\.json is missing/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 5. Malformed active manifest JSON must fail cleanly, not crash with an unhandled exception.
{
  const root = freshRoot();
  const v1Bytes = writeV1Assets(root);
  writeV1Manifest(root, v1Bytes);
  writeFile(root, 'apps/health-web/src/assets/pages/home/v1/manifest.json', '{ this is not valid json');
  writeSupportFiles(root, 'v1');
  const result = runCheck(root);
  check('malformed v1 manifest fails cleanly', result.status !== 0 && /is not valid JSON/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 6. Malformed v2 candidate manifest must also fail cleanly, even though v1 is otherwise valid --
//    a broken commit to the inactive candidate is still a real defect, not silently ignored.
{
  const root = freshRoot();
  const v1Bytes = writeV1Assets(root);
  writeV1Manifest(root, v1Bytes);
  writeFile(root, 'apps/health-web/src/assets/pages/home/v2/manifest.json', '{ also not valid json');
  writeSupportFiles(root, 'v1');
  const result = runCheck(root);
  check('malformed v2 candidate manifest fails cleanly', result.status !== 0 && /is not valid JSON/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 7. Stale/incorrect SHA-256 on a governed asset must fail with a hash-mismatch message.
{
  const root = freshRoot();
  const v1Bytes = writeV1Assets(root);
  const manifest = writeV1Manifest(root, v1Bytes);
  manifest.assets[0].sha256 = '0'.repeat(64);
  writeJson(root, 'apps/health-web/src/assets/pages/home/v1/manifest.json', manifest);
  writeSupportFiles(root, 'v1');
  const result = runCheck(root);
  check('stale SHA-256 fails', result.status !== 0 && /hash mismatch/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 8. An invalid lifecycle status must fail.
{
  const root = freshRoot();
  const v1Bytes = writeV1Assets(root);
  writeV1Manifest(root, v1Bytes, { status: 'NOT_A_REAL_STATE' });
  writeSupportFiles(root, 'v1');
  const result = runCheck(root);
  check('invalid lifecycle status fails', result.status !== 0 && /invalid manifest status/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

// 9. Home.tsx importing an asset the active manifest does not list must fail -- this is the
//    exact defect class the version-aware rewrite must keep catching (previously only checked
//    literal "home/v1/" import paths).
{
  const root = freshRoot();
  const v1Bytes = writeV1Assets(root);
  writeV1Manifest(root, v1Bytes);
  writeSupportFiles(root, 'v1');
  writeFile(root, 'apps/health-web/src/assets/pages/home/v1/web/health-home-rogue-v1.webp', webp('rogue'));
  const rogueSource = homeTsxSource('v1').replace(
    'import "../styles/home.css";',
    'import rogueImage from "../assets/pages/home/v1/web/health-home-rogue-v1.webp";\nimport "../styles/home.css";',
  );
  writeFile(root, 'apps/health-web/src/pages/Home.tsx', rogueSource);
  const result = runCheck(root);
  check('unlisted Home.tsx import fails', result.status !== 0 && /imports unlisted Home v1 asset/.test(result.stderr), result.stdout + result.stderr);
  cleanup(root);
}

console.log(`\nhealth-visual-manifest-check.contract: ${passed} passed, ${failedCount} failed`);
if (failedCount) process.exit(1);
