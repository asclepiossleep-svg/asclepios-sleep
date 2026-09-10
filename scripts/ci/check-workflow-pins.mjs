import fs from 'node:fs/promises';
import path from 'node:path';

const workflowsDir = '.github/workflows';
const shaRef = /^[0-9a-f]{40}$/i;
const violations = [];

const entries = await fs.readdir(workflowsDir, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;

  const filePath = path.join(workflowsDir, entry.name);
  const text = await fs.readFile(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const match = line.match(/^\s*-\s+uses:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (!match) return;

    const actionRef = match[1];
    if (actionRef.startsWith('./') || actionRef.startsWith('docker://')) return;

    const at = actionRef.lastIndexOf('@');
    if (at < 1 || !shaRef.test(actionRef.slice(at + 1))) {
      violations.push(`${filePath}:${index + 1}: ${actionRef}`);
    }
  });
}

if (violations.length > 0) {
  console.error('FAIL workflow action pin policy: external actions must use a full 40-character commit SHA.');
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log('PASS workflow action pin policy: all external workflow actions are pinned to immutable full commit SHAs.');
