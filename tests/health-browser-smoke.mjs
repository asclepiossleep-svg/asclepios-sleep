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

    const consoleResponse = await page.goto(`${baseURL}/internal/visual-console`, { waitUntil: 'networkidle', timeout: 30_000 });
    if (!consoleResponse || !consoleResponse.ok()) {
      throw new Error(`visual console route returned HTTP ${consoleResponse?.status() ?? 'no response'}`);
    }

    await page.locator('h1', { hasText: 'Visual Workflow Console' }).waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('.vwc-banner', { hasText: 'Internal preview' }).waitFor({ state: 'visible', timeout: 5_000 });

    for (const label of ['Approve version', 'Request changes', 'Mark reference only']) {
      await page.locator('.vwc-action-btn', { hasText: label }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    const homeV1Item = page.locator('.vwc-list-item', { hasText: 'v1 (legacy reference capture)' }).first();
    await homeV1Item.waitFor({ state: 'visible', timeout: 5_000 });

    const consoleOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (consoleOverflow) {
      throw new Error('visual console has horizontal overflow');
    }

    if (pageErrors.length > 0) throw new Error(`uncaught browser error(s) on visual console: ${pageErrors.join(' | ')}`);
    if (consoleErrors.length > 0) throw new Error(`console error(s) on visual console: ${consoleErrors.join(' | ')}`);
    if (requestFailures.length > 0) throw new Error(`failed network request(s) on visual console: ${requestFailures.join(' | ')}`);

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-visual-console.png`,
      fullPage: true,
    });

    console.log(`PASS health ${scenario.name} visual console: /internal/visual-console renders version list + action buttons, no horizontal overflow, no runtime console errors, no failed network requests`);

    // v2 slice (issue #131 bounded continuation): create DRAFT -> select DRAFT
    // -> compare parent -> enter review note -> request changes -> decision
    // record visible, with no horizontal overflow at any step.
    await homeV1Item.click();
    await page.locator('.vwc-detail-header .vwc-version-id', { hasText: 'home-v1-reference' }).waitFor({ state: 'visible', timeout: 5_000 });

    await page.locator('.vwc-action-btn', { hasText: 'Create next DRAFT version' }).click();

    const newDraftItem = page.locator('.vwc-list-item.is-selected');
    await newDraftItem.waitFor({ state: 'visible', timeout: 5_000 });
    const newDraftLabel = (await newDraftItem.locator('.vwc-list-item-label').innerText()).trim();
    if (!newDraftLabel.startsWith('New DRAFT')) {
      throw new Error(`expected newly created version to be auto-selected as a DRAFT, got list item label "${newDraftLabel}"`);
    }
    await page.locator('.vwc-detail-header .vwc-badge', { hasText: 'Draft' }).waitFor({ state: 'visible', timeout: 5_000 });

    const draftVersionId = (await page.locator('.vwc-detail-header .vwc-version-id').innerText()).replace('version id:', '').trim();

    const compareSection = page.locator('.vwc-compare-section');
    const selectedColumn = compareSection.locator('.vwc-compare-column', { hasText: 'Selected version' });
    const targetColumn = compareSection.locator('.vwc-compare-column', { hasText: 'Comparison target' });
    await selectedColumn.locator('.vwc-version-id', { hasText: draftVersionId }).waitFor({ state: 'visible', timeout: 5_000 });
    await targetColumn.locator('.vwc-version-id', { hasText: 'home-v1-reference' }).waitFor({ state: 'visible', timeout: 5_000 });

    const comparePreviewCount = await compareSection.locator('.vwc-preview-mock').count();
    if (comparePreviewCount < 4) {
      throw new Error(`expected both desktop+mobile schematic previews for both compared versions (>=4), found ${comparePreviewCount}`);
    }

    const approveBtn = page.locator('.vwc-action-btn', { hasText: 'Approve version' });
    const requestChangesBtn = page.locator('.vwc-action-btn', { hasText: 'Request changes' });
    if (!(await approveBtn.isDisabled())) {
      throw new Error('expected review action buttons to be disabled before a review note is entered');
    }

    const reviewNote = 'Automated smoke-test review note for v2 create-draft/compare/decision-record flow.';
    await page.locator('.vwc-review-note-section .vwc-note-input').fill(reviewNote);

    if (await approveBtn.isDisabled()) {
      throw new Error('expected review action buttons to enable once a non-empty review note is entered');
    }

    await requestChangesBtn.click();

    await page.locator('.vwc-detail-header .vwc-badge', { hasText: 'Changes requested' }).waitFor({ state: 'visible', timeout: 5_000 });

    const decisionRecord = page.locator('.vwc-decision-record').first();
    await decisionRecord.waitFor({ state: 'visible', timeout: 5_000 });
    const decisionText = await decisionRecord.innerText();
    if (!decisionText.includes('LOCAL_PREVIEW_ONLY')) {
      throw new Error('decision record is missing the LOCAL_PREVIEW_ONLY scope marker');
    }
    if (!decisionText.includes(draftVersionId)) {
      throw new Error('decision record does not reference the selected draft version id');
    }
    if (!decisionText.includes('home-v1-reference')) {
      throw new Error('decision record does not reference the comparison target id');
    }
    if (!decisionText.includes(reviewNote)) {
      throw new Error('decision record does not include the owner review note text');
    }

    const v2Overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (v2Overflow) {
      throw new Error('visual console v2 flow (create draft / compare / review note / decision record) has horizontal overflow');
    }

    if (pageErrors.length > 0) throw new Error(`uncaught browser error(s) on visual console v2 flow: ${pageErrors.join(' | ')}`);
    if (consoleErrors.length > 0) throw new Error(`console error(s) on visual console v2 flow: ${consoleErrors.join(' | ')}`);
    if (requestFailures.length > 0) throw new Error(`failed network request(s) on visual console v2 flow: ${requestFailures.join(' | ')}`);

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-visual-console-v2.png`,
      fullPage: true,
    });

    console.log(`PASS health ${scenario.name} visual console v2: create DRAFT -> select DRAFT -> compare parent -> enter note -> request changes -> decision record visible, no horizontal overflow, no runtime console errors, no failed network requests`);
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
