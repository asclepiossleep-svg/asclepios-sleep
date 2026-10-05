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

    const productsResponse = await page.goto(`${baseURL}/products`, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!productsResponse || !productsResponse.ok()) {
      throw new Error(`products page returned HTTP ${productsResponse?.status() ?? 'no response'}`);
    }

    await page.locator('h1', { hasText: 'Sleep support, for night and day.' }).waitFor({ state: 'visible', timeout: 10_000 });

    const chipLabels = ['All Products', 'Sleep', 'Calm', 'Gut & Mood', 'Bundles'];
    for (const label of chipLabels) {
      await page.locator('.health-chip', { hasText: label }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    const productNames = ['SLEEPTAPE™ Nasal Strips', 'REST & SLEEP MODE™', 'DAY MODE™'];
    for (const name of productNames) {
      await page.locator('.health-product-card', { hasText: name }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    await page.locator('.health-chip', { hasText: 'Sleep' }).click();
    for (const name of productNames) {
      await page.locator('.health-product-card', { hasText: name }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    await page.locator('.health-chip', { hasText: 'Calm' }).click();
    await page.locator('.health-products-empty').waitFor({ state: 'visible', timeout: 5_000 });
    const calmCardCount = await page.locator('.health-product-card').count();
    if (calmCardCount !== 0) {
      throw new Error(`expected 0 product cards under "Calm" filter, found ${calmCardCount}`);
    }

    await page.locator('.health-chip', { hasText: 'All Products' }).click();
    for (const name of productNames) {
      await page.locator('.health-product-card', { hasText: name }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    const productsOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (productsOverflow) {
      throw new Error('products page has horizontal overflow');
    }

    if (pageErrors.length > 0) throw new Error(`uncaught browser error(s) on products page: ${pageErrors.join(' | ')}`);
    if (consoleErrors.length > 0) throw new Error(`console error(s) on products page: ${consoleErrors.join(' | ')}`);
    if (requestFailures.length > 0) throw new Error(`failed network request(s) on products page: ${requestFailures.join(' | ')}`);

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-products.png`,
      fullPage: true,
    });

    console.log(`PASS health ${scenario.name} products: heading + all three Phase-1 product names render, "Sleep" chip shows all three, "Calm" chip shows honest empty state, "All Products" restores all three, no horizontal overflow, no runtime console errors, no failed network requests`);

    // Locale switch: zh-HK and zh-CN render their own translated lead copy
    // (not a character conversion of each other), then reset to en so the
    // rest of the scenario runs against known English strings.
    await page.selectOption('.health-lang-select', 'zh-HK');
    await page.locator('.health-products-lead', { hasText: '精心設計嘅產品' }).waitFor({ state: 'visible', timeout: 5_000 });
    await page.selectOption('.health-lang-select', 'zh-CN');
    await page.locator('.health-products-lead', { hasText: '精心设计的产品' }).waitFor({ state: 'visible', timeout: 5_000 });
    await page.selectOption('.health-lang-select', 'en');
    await page.locator('.health-products-lead', { hasText: 'Considered products launching in stages' }).waitFor({ state: 'visible', timeout: 5_000 });

    console.log(`PASS health ${scenario.name} locale switch: zh-HK and zh-CN each render their own translated product lead copy, en restores the fallback locale`);

    // Product -> detail -> add to demo cart path.
    await page.locator('.health-product-card', { hasText: 'SLEEPTAPE™ Nasal Strips' }).click();
    await page.waitForURL(/\/products\/sleeptape$/, { timeout: 10_000 });
    await page.locator('h1', { hasText: 'SLEEPTAPE™ Nasal Strips' }).waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('.health-price-notice', { hasText: 'DEMO' }).first().waitFor({ state: 'visible', timeout: 5_000 });

    await page.locator('button', { hasText: 'Add to Demo Cart' }).click();
    await page.locator('.health-detail-confirmation').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.health-cart-badge', { hasText: '1' }).waitFor({ state: 'visible', timeout: 5_000 });

    const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (detailOverflow) throw new Error('product detail page has horizontal overflow');

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-product-detail.png`,
      fullPage: true,
    });

    console.log(`PASS health ${scenario.name} product detail: SLEEPTAPE detail route renders an honest DEMO price notice, "Add to Demo Cart" shows a confirmation and increments the header cart badge, no horizontal overflow`);

    // Demo cart: quantity change, remove, honest empty-cart state.
    await page.locator('.health-cart-link').click();
    await page.waitForURL(/\/cart$/, { timeout: 10_000 });
    await page.locator('h1', { hasText: 'Demo Cart' }).waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('.health-cart-row', { hasText: 'SLEEPTAPE™ Nasal Strips' }).waitFor({ state: 'visible', timeout: 5_000 });

    await page.locator('.health-cart-row .health-stepper button[aria-label="Increase quantity"]').click();
    await page.locator('.health-stepper-value', { hasText: '2' }).waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.health-cart-badge', { hasText: '2' }).waitFor({ state: 'visible', timeout: 5_000 });

    const cartOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (cartOverflow) throw new Error('cart page has horizontal overflow');

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-cart-with-item.png`,
      fullPage: true,
    });

    await page.locator('.health-cart-remove').click();
    await page.locator('.health-cart-empty-title').waitFor({ state: 'visible', timeout: 5_000 });
    const remainingRows = await page.locator('.health-cart-row').count();
    if (remainingRows !== 0) throw new Error(`expected 0 cart rows after removing the only line, found ${remainingRows}`);

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-cart-empty.png`,
      fullPage: true,
    });

    if (pageErrors.length > 0) throw new Error(`uncaught browser error(s) on cart path: ${pageErrors.join(' | ')}`);
    if (consoleErrors.length > 0) throw new Error(`console error(s) on cart path: ${consoleErrors.join(' | ')}`);
    if (requestFailures.length > 0) throw new Error(`failed network request(s) on cart path: ${requestFailures.join(' | ')}`);

    console.log(`PASS health ${scenario.name} demo cart: quantity increase updates the row and header badge, remove restores the honest empty-cart state, no horizontal overflow, no runtime console errors, no failed network requests`);
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

await browser.close();
if (failed) process.exit(1);
