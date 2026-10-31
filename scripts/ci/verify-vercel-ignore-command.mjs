// Regression probe for the P0 incident (#138): Vercel's per-project
// ignoreCommand is evaluated with cwd = that project's Vercel "Root
// Directory" setting (e.g. apps/web), not the monorepo root. A bare
// `git diff --quiet ... -- apps/web ...` pathspec never matches anything
// from inside apps/web itself, so the command always reports "no change"
// and Vercel skips the build on every commit, including real app fixes.
// This script simulates that exact execution context against a disposable
// git fixture and proves each watched project's ignoreCommand still
// detects a real change to its own directory, and still skips an
// unrelated change elsewhere.
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projects = [
  { name: 'apps/web', vercelJson: 'apps/web/vercel.json' },
  { name: 'apps/api', vercelJson: 'apps/api/vercel.json' },
];

function run(cmd, cwd, extraEnv) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', shell: '/bin/bash', env: { ...process.env, ...extraEnv } });
    return 0;
  } catch (err) {
    return err.status ?? 1;
  }
}

function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'pipe' });
}

let failed = false;

for (const project of projects) {
  const raw = JSON.parse(fs.readFileSync(project.vercelJson, 'utf8'));
  const ignoreCommand = raw.ignoreCommand;
  if (!ignoreCommand) {
    console.log(`FAIL ${project.vercelJson} has no ignoreCommand`);
    failed = true;
    continue;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-ignore-'));
  try {
    git(['init', '-q'], tmp);
    git(['config', 'user.email', 'sum-probe@asclepios.test'], tmp);
    git(['config', 'user.name', 'SUM probe'], tmp);

    fs.mkdirSync(path.join(tmp, project.name), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'packages/shared'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'apps/unrelated-app'), { recursive: true });
    fs.writeFileSync(path.join(tmp, project.name, 'marker.ts'), 'export const v = 1;\n');
    fs.writeFileSync(path.join(tmp, 'packages/shared', 'marker.ts'), 'export const v = 1;\n');
    fs.writeFileSync(path.join(tmp, 'apps/unrelated-app', 'marker.ts'), 'export const v = 1;\n');
    fs.writeFileSync(path.join(tmp, 'package.json'), '{}\n');
    fs.writeFileSync(path.join(tmp, 'package-lock.json'), '{}\n');
    git(['add', '-A'], tmp);
    git(['commit', '-q', '-m', 'base'], tmp);
    const baseSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: tmp }).toString().trim();

    // Case 1: a real change inside this project's own directory must NOT be ignored.
    fs.writeFileSync(path.join(tmp, project.name, 'marker.ts'), 'export const v = 2;\n');
    git(['add', '-A'], tmp);
    git(['commit', '-q', '-m', 'own change'], tmp);
    const projectCwd = path.join(tmp, project.name);
    const ownChangeExit = run(ignoreCommand, projectCwd, { VERCEL_GIT_PREVIOUS_SHA: baseSha });
    if (ownChangeExit === 0) {
      console.log(
        `FAIL ${project.vercelJson}: ignoreCommand reported no change for a real edit inside ${project.name} ` +
          `when evaluated from Vercel's Root Directory cwd (${project.name}) — this is the exact bug that ` +
          'stalled production deployment for incident #138.'
      );
      failed = true;
    } else {
      console.log(`PASS ${project.vercelJson}: own-directory change is correctly NOT ignored`);
    }

    // Case 2: an unrelated project's change must still be ignored (the original rate-limit fix).
    const headAfterOwnChange = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: tmp }).toString().trim();
    fs.writeFileSync(path.join(tmp, 'apps/unrelated-app', 'marker.ts'), 'export const v = 2;\n');
    git(['add', '-A'], tmp);
    git(['commit', '-q', '-m', 'unrelated change'], tmp);
    const unrelatedExit = run(ignoreCommand, projectCwd, { VERCEL_GIT_PREVIOUS_SHA: headAfterOwnChange });
    if (unrelatedExit !== 0) {
      console.log(
        `FAIL ${project.vercelJson}: ignoreCommand did not skip a change confined to apps/unrelated-app — ` +
          'the rate-limit fan-out protection from commit 388a896 would regress.'
      );
      failed = true;
    } else {
      console.log(`PASS ${project.vercelJson}: unrelated-project change is correctly ignored`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (failed) {
  console.log('FAIL vercel ignoreCommand regression probe');
  process.exit(1);
}
console.log('PASS vercel ignoreCommand regression probe');
