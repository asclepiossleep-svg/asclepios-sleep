import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error('Usage: node scripts/ci/import-health-home-v1-assets.mjs <source-dir>');
  process.exit(2);
}

const repoRoot = process.cwd();
const packageRoot = path.join(repoRoot, 'apps/health-web/src/assets/pages/home/v1');

const assets = [
  {
    source: 'approved-home-reference.png',
    target: 'approved-home-reference.png',
    sha256: '4c85ab47d3e009219d191950ac9990832dd4a2ad696b892445060687f0dffb12',
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    source: 'health-home-hero-v1.webp',
    target: 'web/health-home-hero-v1.webp',
    sha256: 'b3b9a4c4df319fb68b8035f52d5bf6fcfaa74c39c5dc7f690218d40e7cbe25af',
    signature: Buffer.from('RIFF'),
    webp: true,
  },
  {
    source: 'health-home-products-card-v1.webp',
    target: 'web/health-home-products-card-v1.webp',
    sha256: 'a44f04a181f33675009ea2279c8079c1c267c72162baf834674e3d98f99e8045',
    signature: Buffer.from('RIFF'),
    webp: true,
  },
];

const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

for (const asset of assets) {
  const src = path.resolve(sourceDir, asset.source);
  const dst = path.join(packageRoot, asset.target);
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

  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.writeFile(dst, bytes);
  console.log(`IMPORTED ${asset.target} ${actualHash}`);
}

console.log('HEALTH_HOME_V1_ASSET_IMPORT_PASS: exact owner-approved reference, hero and products binaries installed.');
