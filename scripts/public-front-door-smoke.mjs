import { execFile as execFileCallback, spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const port = Number(process.env.PUBLIC_FRONT_DOOR_SMOKE_PORT ?? 4173);
const baseUrl = `http://127.0.0.1:${port}`;

const preview = spawn(
  process.execPath,
  [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  {
    cwd: fileURLToPath(new URL('../apps/web', import.meta.url)),
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

let output = '';
preview.stdout.on('data', (chunk) => { output += chunk; });
preview.stderr.on('data', (chunk) => { output += chunk; });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function findBrowser() {
  const candidates = [
    process.env.BROWSER_BIN,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) return candidate;
  }

  throw new Error('No supported Chrome/Chromium binary found; set BROWSER_BIN');
}

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

async function assertAssets(dom, pathname) {
  const assetUrls = [...dom.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], baseUrl));

  for (const url of assetUrls) {
    if (url.origin !== baseUrl) continue;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${pathname} app asset failed: ${url.pathname} returned HTTP ${response.status}`);
    }
  }
}

async function renderInBrowser(browser, pathname, landmarks) {
  const profile = await mkdtemp(join(tmpdir(), 'asclepios-smoke-'));

  try {
    const { stdout, stderr } = await execFile(browser, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--enable-logging=stderr',
      '--virtual-time-budget=3000',
      `--user-data-dir=${profile}`,
      '--dump-dom',
      `${baseUrl}${pathname}`,
    ], { timeout: 20_000, maxBuffer: 10 * 1024 * 1024 });

    const consoleError = stderr.split('\n').find((line) => /CONSOLE.*\bERROR\b/i.test(line));
    if (consoleError) throw new Error(`${pathname} browser console error: ${consoleError}`);

    for (const landmark of landmarks) {
      if (!stdout.includes(landmark)) {
        throw new Error(`${pathname} missing rendered landmark: ${landmark}`);
      }
    }

    await assertAssets(stdout, pathname);
    console.log(`PASS ${pathname} rendered in headless browser with landmarks and app assets`);
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}

try {
  await waitUntilReady();
  const browser = findBrowser();
  await renderInBrowser(browser, '/', ['class="public-site"', 'ASCLĒPIOS HEALTH', 'href="/login"']);
  await renderInBrowser(browser, '/login', ['class="login-page"', 'type="email"']);
  console.log('Public front door browser smoke completed.');
} finally {
  preview.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => preview.once('exit', resolve)),
    sleep(2_000),
  ]);
  if (preview.exitCode === null) preview.kill('SIGKILL');
}
