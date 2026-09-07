import fs from 'node:fs';

const checks = [
  ['SUM master', 'docs/sum/00_SUM_OPERATING_ECOSYSTEM.md'],
  ['AI operating logic', 'docs/sum/01_AI_OPERATING_LOGIC.md'],
  ['Sleep intelligence logic', 'docs/sum/02_SLEEP_INTELLIGENCE_LOGIC.md'],
  ['Growth/marketing logic', 'docs/sum/03_GROWTH_MARKETING_LOGIC.md'],
  ['Integration matrix', 'docs/sum/04_INTEGRATION_MONITORING_MATRIX.md'],
  ['Member app routes', 'apps/web/src/App.tsx'],
  ['Deployment contract', 'DEPLOYMENT.md'],
  ['Rex manager workflow', '.github/workflows/claude-manager-dispatch.yml']
];

let failed = false;
for (const [name, path] of checks) {
  const ok = fs.existsSync(path) && fs.statSync(path).size > 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${path}`);
  if (!ok) failed = true;
}

const app = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
const requiredMemberRoutes = ['/login', '/home', '/assessment', '/tonight', '/checkin', '/review'];
for (const route of requiredMemberRoutes) {
  const ok = app.includes(`path=\"${route}\"`);
  console.log(`${ok ? 'PASS' : 'FAIL'} member route ${route}`);
  if (!ok) failed = true;
}

// Public commerce front-door is intentionally treated as a launch-critical gate,
// not silently assumed. Until a dedicated public route/storefront exists, report
// this as a warning rather than a false PASS.
const hasPublicStorefront = app.includes('PublicHome') || app.includes('/shop') || app.includes('/products');
console.log(`${hasPublicStorefront ? 'PASS' : 'WARN'} public storefront evidence`);

if (failed) process.exit(1);
console.log('SUM structural health check completed.');
