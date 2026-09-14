import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error('Usage: node scripts/ci/import-health-home-v2-assets.mjs <source-dir>');
  process.exit(2);
}

const repoRoot = process.cwd();
const packageRoot = path.join(repoRoot, 'apps/health-web/src/assets/pages/home/v2');

const assets = [
  {
    source: 'approved-home-reference-v2.png',
    target: 'approved-home-reference-v2.png',
    sha256: '9bd1cc1b9bba55d5f133b463dbbeb04e43289172de5a9818d034ca9e1bb1c304',
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    source: 'health-home-hero-v2.webp',
    target: 'web/health-home-hero-v2.webp',
    sha256: '5ab156327c71778b662620780d979c4c2e37da48470575141dbb1ce708ab103b',
    signature: Buffer.from('RIFF'),
    webp: true,
  },
  {
    source: 'health-home-products-card-v2.webp',
    target: 'web/health-home-products-card-v2.webp',
    sha256: 'aa4e011523f262b5b1dec467a597fa4b5d7d971387fe8a6c920293ab089a4f98',
    signature: Buffer.from('RIFF'),
    webp: true,
  },
];

const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const validated = [];

for (const asset of assets) {
  const src = path.resolve(sourceDir, asset.source);
  const bytes = await fs.readFile(src);
  const actualHash = hash(bytes);

  if (actualHash !== asset.sha256) {
    throw new Error(`${asset.source}: SHA-256 mismatch; expected ${asset.sha256}, got ${actualHash}`);
  }
  if (!bytes.subarray(0, asset.signature.length).equals(asset.signature)) {
    throw new Error(`${asset.source}: invalid file signature`);
  }
  if (asset.webp && bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error(`${asset.source}: RIFF container is not WEBP`);
  }

  validated.push({ ...asset, bytes, actualHash });
  console.log(`VALIDATED ${asset.source} ${actualHash}`);
}

for (const asset of validated) {
  const dst = path.join(packageRoot, asset.target);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.writeFile(dst, asset.bytes);

  const persisted = await fs.readFile(dst);
  const persistedHash = hash(persisted);
  if (persistedHash !== asset.sha256) {
    throw new Error(`${asset.target}: post-write SHA-256 mismatch; expected ${asset.sha256}, got ${persistedHash}`);
  }
  console.log(`IMPORTED_AND_VERIFIED ${asset.target} ${persistedHash}`);
}

console.log('HEALTH_HOME_V2_ASSET_IMPORT_PASS: complete owner-approved v2 source set validated first, then installed and post-write verified.');
