import fs from 'node:fs';

const claudeWorkflows = [
  { name: 'manager', path: '.github/workflows/claude-manager-dispatch.yml' },
  { name: 'interactive', path: '.github/workflows/claude.yml' },
];

const privilegedWorkflows = [
  ...claudeWorkflows,
  { name: 'Amanda goal controller', path: '.github/workflows/amanda-goal-controller.yml' },
  { name: 'Claude quota retry', path: '.github/workflows/claude-quota-retry.yml' },
  { name: 'deployment verification', path: '.github/workflows/deployment-verification.yml' },
];

const violations = [];
function requirePattern(content, pattern, message) { if (!pattern.test(content)) violations.push(message); }
function forbidPattern(content, pattern, message) { if (pattern.test(content)) violations.push(message); }

for (const workflow of privilegedWorkflows) {
  const content = fs.readFileSync(workflow.path, 'utf8');
  const prefix = `${workflow.name} workflow`;
  // Explicit permissions may be scoped at workflow or job level. Job-level scoping is
  // intentionally accepted because it can be narrower than one workflow-wide grant.
  requirePattern(content, /^\s*permissions:\s*$/m, `${prefix} must declare explicit GITHUB_TOKEN permissions at workflow or job scope`);
  requirePattern(content, /^\s*timeout-minutes:\s*[1-9][0-9]*\s*$/m, `${prefix} must define a bounded job timeout`);
  forbidPattern(content, /^\s*permissions:\s*write-all\s*$/m, `${prefix} must never use write-all GITHUB_TOKEN permissions`);
}

for (const workflow of claudeWorkflows) {
  const content = fs.readFileSync(workflow.path, 'utf8');
  const prefix = `${workflow.name} workflow`;
  forbidPattern(content, /^\s*--dangerously-skip-permissions(?:\s|$)/m, `${prefix} must never use --dangerously-skip-permissions`);
  requirePattern(content, /^\s*id-token:\s*write\s*$/m, `${prefix} must grant id-token: write because the pinned Claude Code action requires GitHub OIDC`);
  requirePattern(content, /anthropics\/claude-code-action@[0-9a-f]{40}\b/, `${prefix} Claude Code action must be pinned to a full 40-character commit SHA`);
  requirePattern(content, /actions\/checkout@[0-9a-f]{40}\b/, `${prefix} actions/checkout must be pinned to a full 40-character commit SHA`);
  requirePattern(content, /--allowedTools\s+"[^"]+"/, `${prefix} must use an explicit Claude tool allowlist`);
}

const manager = fs.readFileSync('.github/workflows/claude-manager-dispatch.yml', 'utf8');
requirePattern(manager, /Bash\(bash scripts\/rex-safe-git\.sh:\*\)/, 'manager workflow must route Rex git writes through rex-safe-git.sh');
forbidPattern(manager, /Bash\(gh api:\*\)/, 'manager workflow must not grant unrestricted gh api');
forbidPattern(manager, /Bash\(git push:\*\)/, 'manager workflow must not grant raw git push');
forbidPattern(manager, /Bash\(git checkout:\*\)/, 'manager workflow must not grant raw git checkout');
forbidPattern(manager, /Bash\(git switch:\*\)/, 'manager workflow must not grant raw git switch');
forbidPattern(manager, /Bash\(git merge:\*\)/, 'manager workflow must not grant raw git merge');

const safeGit = fs.readFileSync('scripts/rex-safe-git.sh', 'utf8');
requirePattern(safeGit, /expected_prefix="rex\/\$\{issue\}-"/, 'safe git wrapper must bind writes to rex/<issue>- branches');
requirePattern(safeGit, /refusing direct main write/, 'safe git wrapper must explicitly reject main writes');
requirePattern(safeGit, /git push origin "HEAD:\$branch"/, 'safe git wrapper must push only current validated Rex branch');
forbidPattern(safeGit, /--force|-f\b/, 'safe git wrapper must not permit force push');

if (violations.length) {
  console.error('Agent workflow policy violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log('Agent workflow policy: PASS');
