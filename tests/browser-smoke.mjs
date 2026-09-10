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

async function verifyScenario(scenario) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const context = await browser.newContext(scenario.context);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const tracing = attempt > 1;
    if (tracing) {
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    }

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

      if (tracing) {
        await context.tracing.stop();
      }

      console.log(`PASS ${scenario.name} attempt ${attempt}: HTTP ${response.status()}, visible chars ${bodyText.length}`);
      await context.close();
      return true;
    } catch (error) {
      await page.screenshot({
        path: `${outputDir}/${scenario.name}-attempt-${attempt}-failure.png`,
        fullPage: true,
      }).catch(() => {});

      if (tracing) {
        await context.tracing.stop({
          path: `${outputDir}/${scenario.name}-retry-trace.zip`,
        }).catch(() => {});
      }

      console.error(`FAIL ${scenario.name} attempt ${attempt}: ${error.message}`);
      await context.close();

      if (attempt === maxAttempts) return false;
      await new Promise(resolve => setTimeout(resolve, 2_000));
    }
  }

  return false;
}

for (const scenario of scenarios) {
  const passed = await verifyScenario(scenario);
  if (!passed) failed = true;
}

await browser.close();
if (failed) process.exit(1);
