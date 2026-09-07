import fs from 'node:fs';

const checks = [
  ['SUM master', 'docs/sum/00_SUM_OPERATING_ECOSYSTEM.md'],
  ['AI operating logic', 'docs/sum/01_AI_OPERATING_LOGIC.md'],
  ['Sleep intelligence logic', 'docs/sum/02_SLEEP_INTELLIGENCE_LOGIC.md'],
  ['Growth/marketing logic', 'docs/sum/03_GROWTH_MARKETING_LOGIC.md'],
  ['Integration matrix', 'docs/sum/04_INTEGRATION_MONITORING_MATRIX.md'],
  ['Provider registry', 'docs/sum/05_PROVIDER_ADAPTER_REGISTRY.md'],
  ['Execution state machine', 'docs/sum/06_EXECUTION_STATE_MACHINE.md'],
  ['Failure/recovery runbook', 'docs/sum/07_FAILURE_RECOVERY_RUNBOOK.md'],
  ['Machine-readable links', 'config/sum-links.json'],
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

const registry = JSON.parse(fs.readFileSync('config/sum-links.json', 'utf8'));
const allowed = new Set(registry.states ?? []);
if (!Array.isArray(registry.links) || registry.links.length === 0) {
  console.log('FAIL ecosystem link registry is empty');
  failed = true;
} else {
  const ids = new Set();
  for (const link of registry.links) {
    const required = ['id', 'from', 'to', 'criticality', 'expectedProbe', 'currentState'];
    const missing = required.filter((key) => !link[key]);
    if (missing.length) {
      console.log(`FAIL link ${link.id ?? '<unknown>'} missing: ${missing.join(', ')}`);
      failed = true;
    }
    if (ids.has(link.id)) {
      console.log(`FAIL duplicate link id ${link.id}`);
      failed = true;
    }
    ids.add(link.id);
    if (!allowed.has(link.currentState)) {
      console.log(`FAIL link ${link.id} invalid state ${link.currentState}`);
      failed = true;
    }
  }
  const counts = registry.links.reduce((acc, link) => {
    acc[link.currentState] = (acc[link.currentState] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`INFO ecosystem links=${registry.links.length} states=${JSON.stringify(counts)}`);
}

const app = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
const requiredMemberRoutes = ['/login', '/home', '/assessment', '/tonight', '/checkin', '/review'];
for (const route of requiredMemberRoutes) {
  const ok = app.includes(`path=\"${route}\"`);
  console.log(`${ok ? 'PASS' : 'FAIL'} member route ${route}`);
  if (!ok) failed = true;
}

const hasPublicStorefront = app.includes('PublicHome') || app.includes('/shop') || app.includes('/products');
console.log(`${hasPublicStorefront ? 'PASS' : 'WARN'} public storefront evidence`);

if (failed) process.exit(1);
console.log('SUM structural health check completed.');
