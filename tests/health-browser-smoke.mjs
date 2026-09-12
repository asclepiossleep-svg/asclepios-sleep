import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4174';
const outputDir = 'artifacts/health-browser-smoke';
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
  const consoleErrors = [];
  const requestFailures = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    requestFailures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown network failure'}`);
  });

  try {
    const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!response || !response.ok()) {
      throw new Error(`homepage returned HTTP ${response?.status() ?? 'no response'}`);
    }

    await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 });
    const bodyText = (await page.locator('body').innerText()).trim();
    if (bodyText.length < 50) {
      throw new Error(`homepage rendered too little visible content (${bodyText.length} chars)`);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (overflow) {
      throw new Error(`homepage has horizontal overflow (${await page.evaluate(() => `${document.documentElement.scrollWidth}px > ${document.documentElement.clientWidth}px`)})`);
    }

    if (pageErrors.length > 0) throw new Error(`uncaught browser error(s): ${pageErrors.join(' | ')}`);
    if (consoleErrors.length > 0) throw new Error(`console error(s): ${consoleErrors.join(' | ')}`);
    if (requestFailures.length > 0) throw new Error(`failed network request(s): ${requestFailures.join(' | ')}`);

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-homepage.png`,
      fullPage: true,
    });

    console.log(`PASS health ${scenario.name}: HTTP ${response.status()}, visible chars ${bodyText.length}, no horizontal overflow, no runtime console errors, no failed network requests`);
  } catch (error) {
    failed = true;
    await page.screenshot({
      path: `${outputDir}/${scenario.name}-failure.png`,
      fullPage: true,
    }).catch(() => {});
    console.error(`FAIL health ${scenario.name}: ${error.message}`);
  } finally {
    await context.close();
  }
}

const ZH_HK_EYEBROW = '支持更好嘅你';

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!response || !response.ok()) {
      throw new Error(`homepage returned HTTP ${response?.status() ?? 'no response'}`);
    }

    await page.locator('.health-lang-select').selectOption('zh-HK');
    await page.locator(`text=${ZH_HK_EYEBROW}`).waitFor({ state: 'visible', timeout: 5_000 });

    const langAfterSelect = await page.evaluate(() => document.documentElement.lang);
    if (langAfterSelect !== 'zh-HK') {
      throw new Error(`expected html[lang="zh-HK"] after selecting zh-HK, got "${langAfterSelect}"`);
    }

    await page.screenshot({ path: `${outputDir}/locale-zh-HK-selected.png`, fullPage: true });

    await page.reload({ waitUntil: 'networkidle' });
    await page.locator(`text=${ZH_HK_EYEBROW}`).waitFor({ state: 'visible', timeout: 5_000 });

    const langAfterReload = await page.evaluate(() => document.documentElement.lang);
    if (langAfterReload !== 'zh-HK') {
      throw new Error(`expected persisted html[lang="zh-HK"] after reload, got "${langAfterReload}"`);
    }

    const selectValueAfterReload = await page.locator('.health-lang-select').inputValue();
    if (selectValueAfterReload !== 'zh-HK') {
      throw new Error(`expected persisted locale selector to report "zh-HK" after reload, got "${selectValueAfterReload}"`);
    }

    await page.screenshot({ path: `${outputDir}/locale-zh-HK-persisted-after-reload.png`, fullPage: true });

    console.log('PASS health locale switch: zh-HK selection renders Traditional-Chinese copy, sets html[lang="zh-HK"], and persists across reload');
  } catch (error) {
    failed = true;
    await page.screenshot({ path: `${outputDir}/locale-switch-failure.png`, fullPage: true }).catch(() => {});
    console.error(`FAIL health locale switch: ${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();
if (failed) process.exit(1);
