import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const outputDir = 'artifacts/browser-smoke';
await fs.mkdir(outputDir, { recursive: true });

const scenarios = [
  { name: 'desktop', context: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', context: devices['iPhone 13'] },
];

const routes = [
  { name: 'homepage', path: '/', minVisibleChars: 50 },
  { name: 'products', path: '/products', minVisibleChars: 30 },
  { name: 'sleep-app', path: '/sleep-app', minVisibleChars: 30 },
];

const browser = await chromium.launch();
let failed = false;

async function verifyScenario(scenario) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const context = await browser.newContext(scenario.context);
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const requestFailures = [];

    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', request => {
      requestFailures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown network failure'}`);
    });

    const tracing = attempt > 1;
    if (tracing) {
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    }

    try {
      for (const route of routes) {
        pageErrors.length = 0;
        consoleErrors.length = 0;
        requestFailures.length = 0;

        const response = await page.goto(`${baseURL}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
        if (!response || !response.ok()) {
          throw new Error(`${route.name} returned HTTP ${response?.status() ?? 'no response'}`);
        }

        await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 });
        const bodyText = (await page.locator('body').innerText()).trim();
        if (bodyText.length < route.minVisibleChars) {
          throw new Error(`${route.name} rendered too little visible content (${bodyText.length} chars)`);
        }

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        if (overflow) {
          throw new Error(`${route.name} has horizontal overflow (${await page.evaluate(() => `${document.documentElement.scrollWidth}px > ${document.documentElement.clientWidth}px`)})`);
        }

        if (pageErrors.length > 0) {
          throw new Error(`${route.name} uncaught browser error(s): ${pageErrors.join(' | ')}`);
        }

        if (consoleErrors.length > 0) {
          throw new Error(`${route.name} console error(s): ${consoleErrors.join(' | ')}`);
        }

        if (requestFailures.length > 0) {
          throw new Error(`${route.name} failed network request(s): ${requestFailures.join(' | ')}`);
        }

        await page.screenshot({
          path: `${outputDir}/${scenario.name}-${route.name}.png`,
          fullPage: true,
        });

        console.log(`PASS ${scenario.name} ${route.name}: HTTP ${response.status()}, visible chars ${bodyText.length}, no horizontal overflow, no runtime console errors, no failed network requests`);
      }

      if (tracing) {
        await context.tracing.stop();
      }

      console.log(`PASS ${scenario.name} attempt ${attempt}: all required routes verified`);
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
