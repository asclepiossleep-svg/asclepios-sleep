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
  ['Real-world operations', 'docs/sum/08_REAL_WORLD_OPERATIONS_MAP.md'],
  ['Agent external tooling', 'docs/sum/09_AGENT_EXTERNAL_TOOLING.md'],
  ['Machine-readable links', 'config/sum-links.json'],
  ['Provider event contracts', 'apps/api/src/integrations/contracts.ts'],
  ['MCP project contract', '.mcp.json'],
  ['Public storefront', 'apps/web/src/pages/PublicHome.tsx'],
  ['Member app routes', 'apps/web/src/App.tsx'],
  ['Deployment contract', 'DEPLOYMENT.md'],
  ['Rex manager workflow', '.github/workflows/claude-manager-dispatch.yml'],
  ['SUM recurring workflow', '.github/workflows/sum-ecosystem-health.yml']
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
const requiredRoutes = ['/', '/login', '/home', '/assessment', '/tonight', '/checkin', '/review'];
for (const route of requiredRoutes) {
  const ok = app.includes(`path=\"${route}\"`);
  console.log(`${ok ? 'PASS' : 'FAIL'} route ${route}`);
  if (!ok) failed = true;
}
const hasPublicStorefront = app.includes('PublicHome') && app.includes('path="/"');
console.log(`${hasPublicStorefront ? 'PASS' : 'FAIL'} public storefront root connection`);
if (!hasPublicStorefront) failed = true;

const rex = fs.readFileSync('.github/workflows/claude-manager-dispatch.yml', 'utf8');
const rexSafe = rex.includes('Never commit directly to main') && rex.includes('scripts/sum-health-check.mjs');
console.log(`${rexSafe ? 'PASS' : 'FAIL'} Rex branch/PR safety contract`);
if (!rexSafe) failed = true;

const mcp = JSON.parse(fs.readFileSync('.mcp.json', 'utf8'));
const supabaseUrl = mcp?.mcpServers?.supabase?.url ?? '';
const mcpScoped = supabaseUrl.includes('project_ref=${SUPABASE_PROJECT_REF}') && supabaseUrl.includes('read_only=true');
console.log(`${mcpScoped ? 'PASS' : 'FAIL'} Supabase MCP scoped/read-only default`);
if (!mcpScoped) failed = true;

if (failed) process.exit(1);
console.log('SUM structural health check completed.');
