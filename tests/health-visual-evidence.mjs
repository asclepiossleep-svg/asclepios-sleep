import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseURL = process.env.HEALTH_BASE_URL || 'http://127.0.0.1:4174';
const outDir = 'artifacts/health-visual-evidence';
await fs.mkdir(outDir, { recursive: true });

const cases = [
  { name: 'desktop', viewport: { width: 1440, height: 1200 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];

const browser = await chromium.launch({ headless: true });
let failed = false;

for (const testCase of cases) {
  const context = await browser.newContext({ viewport: testCase.viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const response = await page.goto(`${baseURL}/`, { waitUntil: 'networkidle', timeout: 30_000 });
  if (!response?.ok()) {
    console.error(`HEALTH_VISUAL_FAIL: ${testCase.name} home response was not OK`);
    failed = true;
  }

  const bodyText = await page.locator('body').innerText();
  for (const required of ['Better Sleep', 'Products', 'Sleep', 'Learning']) {
    if (!bodyText.includes(required)) {
      console.error(`HEALTH_VISUAL_FAIL: ${testCase.name} missing visible text: ${required}`);
      failed = true;
    }
  }

  const unloaded = await page.locator('img').evaluateAll((imgs) =>
    imgs.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute('src')),
  );
  if (unloaded.length) {
    console.error(`HEALTH_VISUAL_FAIL: ${testCase.name} has unloaded images: ${unloaded.join(', ')}`);
    failed = true;
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) {
    console.error(`HEALTH_VISUAL_FAIL: ${testCase.name} has horizontal overflow`);
    failed = true;
  }

  if (consoleErrors.length) {
    console.error(`HEALTH_VISUAL_FAIL: ${testCase.name} console errors: ${consoleErrors.join(' | ')}`);
    failed = true;
  }

  await page.screenshot({ path: `${outDir}/home-${testCase.name}.png`, fullPage: true });
  await context.close();
}

await browser.close();
if (failed) process.exit(1);
console.log('HEALTH_VISUAL_EVIDENCE_PASS: desktop/mobile Home evidence captured and deterministic visible checks passed.');
