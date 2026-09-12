import fs from 'node:fs';

const workflows = [
  {
    name: 'manager',
    path: '.github/workflows/claude-manager-dispatch.yml',
  },
  {
    name: 'interactive',
    path: '.github/workflows/claude.yml',
  },
];

const violations = [];

function requirePattern(content, pattern, message) {
  if (!pattern.test(content)) violations.push(message);
}

function forbidPattern(content, pattern, message) {
  if (pattern.test(content)) violations.push(message);
}

for (const workflow of workflows) {
  const content = fs.readFileSync(workflow.path, 'utf8');
  const prefix = `${workflow.name} workflow`;

  // Match only an actual Claude CLI argument line. Mentions in YAML comments or
  // explanatory prose must not trip the gate, otherwise the policy can fail on
  // documentation that explicitly says the bypass is forbidden.
  forbidPattern(
    content,
    /^\s*--dangerously-skip-permissions(?:\s|$)/m,
    `${prefix} must never use --dangerously-skip-permissions`,
  );
  requirePattern(
    content,
    /^\s*id-token:\s*write\s*$/m,
    `${prefix} must grant id-token: write because the pinned Claude Code action requires GitHub OIDC to bootstrap its app token`,
  );
  requirePattern(
    content,
    /^\s*timeout-minutes:\s*[1-9][0-9]*\s*$/m,
    `${prefix} must define a bounded job timeout`,
  );
  requirePattern(
    content,
    /anthropics\/claude-code-action@[0-9a-f]{40}\b/,
    `${prefix} Claude Code action must be pinned to a full 40-character commit SHA`,
  );
  requirePattern(
    content,
    /actions\/checkout@[0-9a-f]{40}\b/,
    `${prefix} actions/checkout must be pinned to a full 40-character commit SHA`,
  );
  requirePattern(
    content,
    /--allowedTools\s+"[^"]+"/,
    `${prefix} must use an explicit Claude tool allowlist`,
  );
}

if (violations.length) {
  console.error('Agent workflow policy violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Agent workflow policy: PASS');
