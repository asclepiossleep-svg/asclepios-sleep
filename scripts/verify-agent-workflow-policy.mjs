import fs from 'node:fs';

const managerPath = '.github/workflows/claude-manager-dispatch.yml';
const manager = fs.readFileSync(managerPath, 'utf8');

const violations = [];

function requirePattern(pattern, message) {
  if (!pattern.test(manager)) violations.push(message);
}

function forbidPattern(pattern, message) {
  if (pattern.test(manager)) violations.push(message);
}

forbidPattern(/dangerously-skip-permissions/, 'manager workflow must never use --dangerously-skip-permissions');
requirePattern(/^\s*id-token:\s*write\s*$/m, 'manager workflow must grant id-token: write because the pinned Claude Code action requires GitHub OIDC to bootstrap its app token');
requirePattern(/^\s*timeout-minutes:\s*[1-9][0-9]*\s*$/m, 'manager workflow must define a bounded job timeout');
requirePattern(/anthropics\/claude-code-action@[0-9a-f]{40}\b/, 'Claude Code action must be pinned to a full 40-character commit SHA');
requirePattern(/actions\/checkout@[0-9a-f]{40}\b/, 'actions/checkout must be pinned to a full 40-character commit SHA');
requirePattern(/--allowedTools\s+"[^"]+"/, 'manager workflow must use an explicit Claude tool allowlist');

if (violations.length) {
  console.error('Agent workflow policy violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Agent workflow policy: PASS');
