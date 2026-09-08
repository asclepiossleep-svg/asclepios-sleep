import { spawn } from 'node:child_process';

const port = Number(process.env.PUBLIC_FRONT_DOOR_SMOKE_PORT ?? 4173);
const baseUrl = `http://127.0.0.1:${port}`;

const preview = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'preview', '--workspace=apps/web', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

let output = '';
preview.stdout.on('data', (chunk) => { output += chunk; });
preview.stderr.on('data', (chunk) => { output += chunk; });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitUntilReady() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (preview.exitCode !== null) {
      throw new Error(`preview exited before becoming ready\n${output}`);
    }

    try {
      const response = await fetch(baseUrl, { redirect: 'manual' });
      if (response.ok) return;
    } catch {
      // The preview server may still be binding its port.
    }

    await sleep(250);
  }

  throw new Error(`preview did not become ready at ${baseUrl}\n${output}`);
}

async function probe(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: 'manual' });
  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`${pathname} returned HTTP ${response.status}`);
  }
  if (!body.includes('<div id="root"></div>')) {
    throw new Error(`${pathname} did not return the web application shell`);
  }

  console.log(`PASS ${pathname} returned HTTP 200 and the application shell`);
}

try {
  await waitUntilReady();
  await probe('/');
  await probe('/login');
  console.log('Public front door runtime smoke completed.');
} finally {
  preview.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => preview.once('exit', resolve)),
    sleep(2_000),
  ]);
  if (preview.exitCode === null) preview.kill('SIGKILL');
}
