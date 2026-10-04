import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4174';
const outputDir = 'artifacts/health-browser-smoke';
await fs.mkdir(outputDir, { recursive: true });

// Shipped V1 locales (AGENTS.md §3). Read straight from the i18n resource
// files so this test checks the hero against whatever copy actually ships,
// not a second hardcoded copy of the strings.
const LOCALES = ['en', 'zh-HK', 'zh-CN'];
const LOCALE_STORAGE_KEY = 'health.locale'; // apps/health-web/src/i18n/index.ts STORAGE_KEY

const heroCopy = {};
for (const locale of LOCALES) {
  const resource = JSON.parse(await fs.readFile(`apps/health-web/src/i18n/${locale}.json`, 'utf8'));
  heroCopy[locale] = {
    line1: resource['health.hero.title.line1'],
    line2: resource['health.hero.title.line2'],
    primaryCta: resource['health.hero.cta.products'],
    secondaryCta: resource['health.hero.cta.sleepApp'],
  };
}

const scenarios = [
  { name: 'desktop', context: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', context: devices['iPhone 13'] },
];

const browser = await chromium.launch();
let failed = false;

async function assertVisibleFocus(locator, label) {
  await locator.focus();
  const style = await locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow };
  });
  const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
  const hasBoxShadow = style.boxShadow !== 'none';
  if (!hasOutline && !hasBoxShadow) {
    throw new Error(
      `${label} has no visible keyboard focus indicator (outline: ${style.outlineStyle} ${style.outlineWidth}, box-shadow: ${style.boxShadow})`,
    );
  }
}

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

    for (const locale of LOCALES) {
      await page.evaluate(
        ({ key, value }) => window.localStorage.setItem(key, value),
        { key: LOCALE_STORAGE_KEY, value: locale },
      );
      const localeResponse = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30_000 });
      if (!localeResponse || !localeResponse.ok()) {
        throw new Error(`[${locale}] homepage returned HTTP ${localeResponse?.status() ?? 'no response'}`);
      }

      const copy = heroCopy[locale];
      const heroHeading = page.locator('.health-hero-content h1');
      await heroHeading.waitFor({ state: 'visible', timeout: 10_000 });
      const headingText = (await heroHeading.innerText()).trim();
      const expectedHeading = `${copy.line1}\n${copy.line2}`;
      if (headingText !== expectedHeading) {
        throw new Error(`[${locale}] hero headline mismatch: expected ${JSON.stringify(expectedHeading)}, got ${JSON.stringify(headingText)}`);
      }

      const primaryCta = page.locator('.health-hero-actions a.health-button.primary');
      await primaryCta.waitFor({ state: 'visible', timeout: 5_000 });
      const primaryText = (await primaryCta.innerText()).trim();
      if (primaryText !== copy.primaryCta) {
        throw new Error(`[${locale}] primary CTA text mismatch: expected ${JSON.stringify(copy.primaryCta)}, got ${JSON.stringify(primaryText)}`);
      }
      const primaryHref = await primaryCta.getAttribute('href');
      if (!primaryHref || !primaryHref.endsWith('/products')) {
        throw new Error(`[${locale}] primary CTA does not point to the existing /products destination (href=${primaryHref})`);
      }
      await assertVisibleFocus(primaryCta, `[${locale}] primary CTA`);

      const secondaryCta = page.locator('.health-hero-actions .health-button.secondary');
      await secondaryCta.waitFor({ state: 'visible', timeout: 5_000 });
      const secondaryText = (await secondaryCta.innerText()).trim();
      if (secondaryText !== copy.secondaryCta) {
        throw new Error(`[${locale}] secondary CTA text mismatch: expected ${JSON.stringify(copy.secondaryCta)}, got ${JSON.stringify(secondaryText)}`);
      }
      // SleepAppLink renders a real <a href> once VITE_SLEEP_APP_URL is configured,
      // and an honestly aria-disabled <span> (no invented URL) until then — assert
      // whichever is actually shipped rather than assuming one shape.
      const secondaryTag = await secondaryCta.evaluate((el) => el.tagName.toLowerCase());
      if (secondaryTag === 'a') {
        const secondaryHref = await secondaryCta.getAttribute('href');
        if (!secondaryHref) {
          throw new Error(`[${locale}] secondary CTA renders as a link with no destination href`);
        }
        await assertVisibleFocus(secondaryCta, `[${locale}] secondary CTA`);
      } else {
        const ariaDisabled = await secondaryCta.getAttribute('aria-disabled');
        if (ariaDisabled !== 'true') {
          throw new Error(`[${locale}] secondary CTA is neither a real link nor honestly marked aria-disabled`);
        }
      }

      const localeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (localeOverflow) {
        throw new Error(`[${locale}] homepage has horizontal overflow`);
      }

      if (pageErrors.length > 0) throw new Error(`[${locale}] uncaught browser error(s): ${pageErrors.join(' | ')}`);
      if (consoleErrors.length > 0) throw new Error(`[${locale}] console error(s): ${consoleErrors.join(' | ')}`);
      if (requestFailures.length > 0) throw new Error(`[${locale}] failed network request(s): ${requestFailures.join(' | ')}`);

      await page.screenshot({
        path: `${outputDir}/${scenario.name}-${locale}-homepage.png`,
        fullPage: true,
      });

      console.log(
        `PASS health ${scenario.name} ${locale}: hero headline/CTA copy matches shipped i18n resource, CTAs point to existing destinations, no horizontal overflow, visible keyboard focus, no runtime console errors, no failed network requests`,
      );
    }

    // Reset to English before the existing English-only products-page assertions below.
    await page.evaluate((key) => window.localStorage.setItem(key, 'en'), LOCALE_STORAGE_KEY);

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
