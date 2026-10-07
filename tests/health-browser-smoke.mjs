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
  const context = await browser.newContext({ acceptDownloads: true, ...scenario.context });
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

    // Committing a review action must change only the exact selected version
    // id — every sibling version, page family, and all three legacy
    // REFERENCE_ONLY seed records must be left byte-for-byte unchanged.
    const referenceOnlyBadgeCount = await page.locator('.vwc-list-item .vwc-badge', { hasText: 'Reference only' }).count();
    if (referenceOnlyBadgeCount !== 3) {
      throw new Error(`expected exactly 3 untouched REFERENCE_ONLY seed records, found ${referenceOnlyBadgeCount} "Reference only" badges`);
    }
    const homeV2DraftBadge = (await page.locator('.vwc-list-item', { hasText: 'v2 (console mock draft)' }).locator('.vwc-badge').innerText()).trim();
    if (homeV2DraftBadge !== 'Draft') {
      throw new Error(`expected sibling home-v2-draft to remain "Draft", found "${homeV2DraftBadge}"`);
    }
    const productsV2ReadyBadge = (await page.locator('.vwc-list-item', { hasText: 'v2 (ready for review mock)' }).locator('.vwc-badge').innerText()).trim();
    if (productsV2ReadyBadge !== 'Ready for review') {
      throw new Error(`expected sibling products-v2-ready to remain "Ready for review", found "${productsV2ReadyBadge}"`);
    }
    const mutatedDraftItem = page.locator('.vwc-list-item', { hasText: newDraftLabel });
    const mutatedDraftBadge = (await mutatedDraftItem.locator('.vwc-badge').innerText()).trim();
    if (mutatedDraftBadge !== 'Changes requested') {
      throw new Error(`expected only the exact selected draft version to change status, found "${mutatedDraftBadge}"`);
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

    // Version-note isolation (issue #131 correctness slice): a note entered
    // for one version must never carry over and enable/populate a review
    // action for a different version.
    const homeV2DraftItem = page.locator('.vwc-list-item', { hasText: 'v2 (console mock draft)' });
    await homeV2DraftItem.click();
    await page.locator('.vwc-detail-header .vwc-version-id', { hasText: 'home-v2-draft' }).waitFor({ state: 'visible', timeout: 5_000 });

    const isolationNote = 'Note meant only for home-v2-draft — must never be usable against another version.';
    const noteInput = page.locator('.vwc-review-note-section .vwc-note-input');
    await noteInput.fill(isolationNote);
    if (await approveBtn.isDisabled()) {
      throw new Error('expected review buttons to enable for home-v2-draft once its own note is entered');
    }

    const productsV2ReadyItem = page.locator('.vwc-list-item', { hasText: 'v2 (ready for review mock)' });
    await productsV2ReadyItem.click();
    await page.locator('.vwc-detail-header .vwc-version-id', { hasText: 'products-v2-ready' }).waitFor({ state: 'visible', timeout: 5_000 });

    const noteAfterSwitch = await noteInput.inputValue();
    if (noteAfterSwitch !== '') {
      throw new Error(`expected the review note to clear when switching selected version, found leftover text: "${noteAfterSwitch}"`);
    }
    if (!(await approveBtn.isDisabled())) {
      throw new Error('expected review buttons to be disabled again after switching to a version with no note of its own');
    }

    const decisionCountBeforeAttempt = await page.locator('.vwc-decision-record').count();
    await requestChangesBtn.click({ force: true });
    const decisionCountAfterAttempt = await page.locator('.vwc-decision-record').count();
    if (decisionCountAfterAttempt !== decisionCountBeforeAttempt) {
      throw new Error("a disabled review action committed a decision record — version A's note leaked into version B's review action");
    }
    const productsV2BadgeAfterAttempt = (await productsV2ReadyItem.locator('.vwc-badge').innerText()).trim();
    if (productsV2BadgeAfterAttempt !== 'Ready for review') {
      throw new Error(`expected products-v2-ready status to be unaffected by the blocked cross-version review attempt, found "${productsV2BadgeAfterAttempt}"`);
    }
    const homeV2BadgeAfterAttempt = (await homeV2DraftItem.locator('.vwc-badge').innerText()).trim();
    if (homeV2BadgeAfterAttempt !== 'Draft') {
      throw new Error(`expected home-v2-draft status to be unaffected, found "${homeV2BadgeAfterAttempt}"`);
    }

    console.log(`PASS health ${scenario.name} visual console version isolation: a note entered on home-v2-draft is cleared on switching to products-v2-ready, review actions stay disabled, and a forced click on the disabled button commits nothing`);

    // Copy JSON: deterministic clipboard stub, no real OS clipboard permission.
    await page.evaluate(() => {
      window.__vwcCopiedText = null;
      navigator.clipboard.writeText = (text) => {
        window.__vwcCopiedText = text;
        return Promise.resolve();
      };
    });

    const firstDecisionRecord = page.locator('.vwc-decision-record').first();
    await firstDecisionRecord.locator('.vwc-action-btn.copy').click();
    await firstDecisionRecord.locator('.vwc-action-btn.copy', { hasText: 'Copied!' }).waitFor({ state: 'visible', timeout: 5_000 });

    const copiedRaw = await page.evaluate(() => window.__vwcCopiedText);
    if (!copiedRaw) {
      throw new Error('Copy JSON did not write anything through the stubbed clipboard');
    }
    let copiedDecision;
    try {
      copiedDecision = JSON.parse(copiedRaw);
    } catch (error) {
      throw new Error(`Copy JSON clipboard payload was not valid JSON: ${error.message}`);
    }
    const requiredDecisionFields = [
      'decisionId',
      'selectedVersionId',
      'comparisonTargetId',
      'previousStatus',
      'newStatus',
      'reviewNote',
      'timestamp',
      'scope',
    ];
    for (const field of requiredDecisionFields) {
      if (!(field in copiedDecision)) {
        throw new Error(`Copy JSON payload is missing required decision field "${field}"`);
      }
    }
    if (copiedDecision.scope !== 'LOCAL_PREVIEW_ONLY') {
      throw new Error(`Copy JSON payload scope expected "LOCAL_PREVIEW_ONLY", found "${copiedDecision.scope}"`);
    }
    if (copiedDecision.selectedVersionId !== draftVersionId) {
      throw new Error('Copy JSON payload does not match the visible decision record selected version id');
    }

    console.log(`PASS health ${scenario.name} visual console copy JSON: stubbed clipboard received valid JSON with every required decision field and LOCAL_PREVIEW_ONLY scope`);

    // Download JSON: intercept the client-side Blob download; no backend/network write.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.vwc-action-btn.download', { hasText: 'Download all as JSON' }).click(),
    ]);
    const suggestedFilename = download.suggestedFilename();
    if (!/^visual-console-decisions-\d+\.json$/.test(suggestedFilename)) {
      throw new Error(`unexpected download filename: "${suggestedFilename}"`);
    }
    const downloadStream = await download.createReadStream();
    const downloadChunks = [];
    for await (const chunk of downloadStream) downloadChunks.push(chunk);
    const downloadedText = Buffer.concat(downloadChunks).toString('utf-8');
    let downloadedDecisions;
    try {
      downloadedDecisions = JSON.parse(downloadedText);
    } catch (error) {
      throw new Error(`downloaded decisions file was not valid JSON: ${error.message}`);
    }
    if (!Array.isArray(downloadedDecisions) || downloadedDecisions.length !== 1) {
      throw new Error(`expected exactly one decision record in the download, found ${Array.isArray(downloadedDecisions) ? downloadedDecisions.length : 'non-array'}`);
    }
    const downloadedDecision = downloadedDecisions[0];
    if (
      downloadedDecision.decisionId !== copiedDecision.decisionId ||
      downloadedDecision.reviewNote !== copiedDecision.reviewNote ||
      downloadedDecision.scope !== 'LOCAL_PREVIEW_ONLY'
    ) {
      throw new Error('downloaded JSON does not match the exact visible decision record');
    }

    console.log(`PASS health ${scenario.name} visual console download JSON: intercepted client-side download has a valid filename and contains the exact visible decision record, no backend write`);

    // Reload must restore the original seed state and discard local drafts/decisions.
    const reloadResponse = await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    if (!reloadResponse || !reloadResponse.ok()) {
      throw new Error(`visual console reload returned HTTP ${reloadResponse?.status() ?? 'no response'}`);
    }
    await page.locator('h1', { hasText: 'Visual Workflow Console' }).waitFor({ state: 'visible', timeout: 10_000 });

    const decisionsAfterReload = await page.locator('.vwc-decision-record').count();
    if (decisionsAfterReload !== 0) {
      throw new Error(`expected 0 decision records after reload, found ${decisionsAfterReload}`);
    }
    await page.locator('.vwc-decisions-section', { hasText: 'No review actions committed yet this session.' }).waitFor({ state: 'visible', timeout: 5_000 });

    const newDraftCountAfterReload = await page.locator('.vwc-list-item', { hasText: 'New DRAFT' }).count();
    if (newDraftCountAfterReload !== 0) {
      throw new Error('expected the locally created DRAFT version to be discarded after reload');
    }

    const homeV1BadgeAfterReload = (await page.locator('.vwc-list-item', { hasText: 'v1 (legacy reference capture)' }).first().locator('.vwc-badge').innerText()).trim();
    if (homeV1BadgeAfterReload !== 'Reference only') {
      throw new Error(`expected a legacy reference seed version to read "Reference only" after reload, found "${homeV1BadgeAfterReload}"`);
    }
    const referenceOnlyBadgeCountAfterReload = await page.locator('.vwc-list-item .vwc-badge', { hasText: 'Reference only' }).count();
    if (referenceOnlyBadgeCountAfterReload !== 3) {
      throw new Error(`expected exactly 3 REFERENCE_ONLY seed records after reload, found ${referenceOnlyBadgeCountAfterReload}`);
    }

    const reloadOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (reloadOverflow) {
      throw new Error('visual console has horizontal overflow after reload');
    }
    if (pageErrors.length > 0) throw new Error(`uncaught browser error(s) after visual console reload: ${pageErrors.join(' | ')}`);
    if (consoleErrors.length > 0) throw new Error(`console error(s) after visual console reload: ${consoleErrors.join(' | ')}`);

    await page.screenshot({
      path: `${outputDir}/${scenario.name}-visual-console-reload.png`,
      fullPage: true,
    });

    console.log(`PASS health ${scenario.name} visual console reload: decisions and locally created drafts are discarded, seed versions and statuses are restored, no horizontal overflow`);
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
