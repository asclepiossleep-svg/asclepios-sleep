import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const outputDir = 'artifacts/browser-smoke';
await fs.mkdir(outputDir, { recursive: true });

const scenarios = [
  { name: 'desktop', context: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', context: devices['iPhone 13'] },
];

const browser = await chromium.launch();
let failed = false;

for (const scenario of scenarios) {
  const context = await browser.newContext(scenario.context);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!response || !response.ok()) {
      throw new Error(`Homepage returned HTTP ${response?.status() ?? 'no response'}`);
    }

    await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 });
    const bodyText = (await page.locator('body').innerText()).trim();
    if (bodyText.length < 50) {
      throw new Error(`Homepage rendered too little visible content (${bodyText.length} chars)`);
    }

    if (pageErrors.length > 0) {
      throw new Error(`Uncaught browser error(s): ${pageErrors.join(' | ')}`);
    }

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-homepage.png`,
      fullPage: true,
    });

    console.log(`PASS ${scenario.name}: HTTP ${response.status()}, visible chars ${bodyText.length}`);
  } catch (error) {
    failed = true;
    await page.screenshot({
      path: `${outputDir}/${scenario.name}-failure.png`,
      fullPage: true,
    }).catch(() => {});
    console.error(`FAIL ${scenario.name}: ${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();
if (failed) process.exit(1);
