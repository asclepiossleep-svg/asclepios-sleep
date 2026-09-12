import fs from 'node:fs/promises';
import path from 'node:path';

const workflowsDir = '.github/workflows';
const shaRef = /^[0-9a-f]{40}$/i;
const actionViolations = [];
const runnerViolations = [];

const entries = await fs.readdir(workflowsDir, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;

  const filePath = path.join(workflowsDir, entry.name);
  const text = await fs.readFile(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const actionMatch = line.match(/^\s*-\s+uses:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (actionMatch) {
      const actionRef = actionMatch[1];
      if (!actionRef.startsWith('./') && !actionRef.startsWith('docker://')) {
        const at = actionRef.lastIndexOf('@');
        if (at < 1 || !shaRef.test(actionRef.slice(at + 1))) {
          actionViolations.push(`${filePath}:${index + 1}: ${actionRef}`);
        }
      }
    }

    const runnerMatch = line.match(/^\s*runs-on:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (runnerMatch && /-latest$/i.test(runnerMatch[1])) {
      runnerViolations.push(`${filePath}:${index + 1}: ${runnerMatch[1]}`);
    }
  });
}

if (actionViolations.length > 0 || runnerViolations.length > 0) {
  if (actionViolations.length > 0) {
    console.error('FAIL workflow action pin policy: external actions must use a full 40-character commit SHA.');
    for (const violation of actionViolations) console.error(`  ${violation}`);
  }
  if (runnerViolations.length > 0) {
    console.error('FAIL workflow runner pin policy: GitHub-hosted runners must use an explicit versioned label, not a movable *-latest label.');
    for (const violation of runnerViolations) console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.log('PASS workflow action pin policy: all external workflow actions are pinned to immutable full commit SHAs.');
console.log('PASS workflow runner pin policy: no movable *-latest runner labels are used.');
