import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4174';
const outputDir = 'artifacts/health-locale-switch';
await fs.mkdir(outputDir, { recursive: true });

const ZH_HK_EYEBROW = '支持更好嘅你';

const browser = await chromium.launch();
let failed = false;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

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

  await page.screenshot({ path: `${outputDir}/zh-HK-selected.png`, fullPage: true });

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

  await page.screenshot({ path: `${outputDir}/zh-HK-persisted-after-reload.png`, fullPage: true });

  console.log('PASS health locale switch: zh-HK selection renders Traditional-Chinese copy, sets html[lang="zh-HK"], and persists across reload');
  await context.close();
} catch (error) {
  failed = true;
  console.error(`FAIL health locale switch: ${error.message}`);
}

await browser.close();
if (failed) process.exit(1);
