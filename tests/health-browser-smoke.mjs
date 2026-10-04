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

    const opsConsoleResponse = await page.goto(`${baseURL}/internal/ops-console`, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!opsConsoleResponse || !opsConsoleResponse.ok()) {
      throw new Error(`ops console route returned HTTP ${opsConsoleResponse?.status() ?? 'no response'}`);
    }

    await page.locator('h1', { hasText: 'Owner Operations Console' }).waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('.ooc-banner', { hasText: 'Internal preview' }).waitFor({ state: 'visible', timeout: 5_000 });

    const summaryLabels = ['Orders needing action', 'Fulfilment exceptions', 'Returns / refunds pending'];
    for (const label of summaryLabels) {
      await page.locator('.ooc-summary-card', { hasText: label }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    await page.locator('.ooc-list-row', { hasText: 'DEMO-ORD-1003' }).first().click();
    await page.locator('.ooc-detail h2', { hasText: 'DEMO-ORD-1003' }).waitFor({ state: 'visible', timeout: 5_000 });

    for (const label of ['Order', 'Payment', 'Inventory', 'Fulfilment', 'Delivery', 'Entitlement', 'Support']) {
      await page.locator('.ooc-chain-label', { hasText: label }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    await page.locator('.ooc-action-btn', { hasText: 'Mark fulfilment exception resolved' }).click();
    await page.locator('.ooc-log li', { hasText: 'Marked fulfilment exception resolved: DEMO-ORD-1003' }).waitFor({ state: 'visible', timeout: 5_000 });

    const opsConsoleOverflowDiagnostics = await page.evaluate(() => {
      const root = document.documentElement;
      const viewportWidth = root.clientWidth;
      const scrollWidth = root.scrollWidth;
      const offenders = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        if (rect.right > viewportWidth + 1 || rect.left < -1) {
          const computed = getComputedStyle(el);
          const classAttr = typeof el.className === 'string' ? el.className.trim() : '';
          const selector = el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : '') +
            (classAttr ? `.${classAttr.split(/\s+/).join('.')}` : '');
          offenders.push({
            selector,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            overflowX: computed.overflowX,
            minWidth: computed.minWidth,
            whiteSpace: computed.whiteSpace,
          });
        }
      });
      offenders.sort((a, b) => b.right - a.right);
      return { viewportWidth, scrollWidth, offenders: offenders.slice(0, 15) };
    });

    const diagnosticLines = [
      `DIAGNOSTIC ${scenario.name} ops console: scrollWidth=${opsConsoleOverflowDiagnostics.scrollWidth}px clientWidth=${opsConsoleOverflowDiagnostics.viewportWidth}px`,
      ...opsConsoleOverflowDiagnostics.offenders.map(
        offender =>
          `DIAGNOSTIC ${scenario.name} offender: ${offender.selector} left=${offender.left} right=${offender.right} width=${offender.width} overflow-x=${offender.overflowX} min-width=${offender.minWidth} white-space="${offender.whiteSpace}"`
      ),
    ];
    for (const line of diagnosticLines) console.log(line);
    await fs.writeFile(`${outputDir}/${scenario.name}-ops-console-diagnostics.txt`, diagnosticLines.join('\n') + '\n');

    const opsConsoleOverflow = opsConsoleOverflowDiagnostics.scrollWidth > opsConsoleOverflowDiagnostics.viewportWidth + 1;
    if (opsConsoleOverflow) {
      const offenderSummary = opsConsoleOverflowDiagnostics.offenders
        .map(offender => `${offender.selector}(right=${offender.right}px,width=${offender.width}px,min-width=${offender.minWidth})`)
        .join(', ') || 'no element bounding rect crossed the viewport';
      throw new Error(
        `ops console has horizontal overflow (scrollWidth=${opsConsoleOverflowDiagnostics.scrollWidth}px > clientWidth=${opsConsoleOverflowDiagnostics.viewportWidth}px); offenders: ${offenderSummary}`
      );
    }

    if (pageErrors.length > 0) throw new Error(`uncaught browser error(s) on ops console: ${pageErrors.join(' | ')}`);
    if (consoleErrors.length > 0) throw new Error(`console error(s) on ops console: ${consoleErrors.join(' | ')}`);
    if (requestFailures.length > 0) throw new Error(`failed network request(s) on ops console: ${requestFailures.join(' | ')}`);

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-ops-console.png`,
      fullPage: true,
    });

    console.log(`PASS health ${scenario.name} ops console: /internal/ops-console renders summary cards + order list + lifecycle chain, local-only action updates session log, no horizontal overflow, no runtime console errors, no failed network requests`);
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
