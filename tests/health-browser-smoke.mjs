import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4174';
const outputDir = 'artifacts/health-browser-smoke';
await fs.mkdir(outputDir, { recursive: true });

// Badge text is rendered with CSS text-transform: uppercase, so innerText()
// legitimately returns upper case. Compare the semantic value, not the
// rendered case.
const normalizeBadgeText = (text) => text.trim().toLowerCase();

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
    const homeV2DraftBadge = await page.locator('.vwc-list-item', { hasText: 'v2 (console mock draft)' }).locator('.vwc-badge').innerText();
    if (normalizeBadgeText(homeV2DraftBadge) !== 'draft') {
      throw new Error(`expected sibling home-v2-draft to remain "Draft", found "${homeV2DraftBadge.trim()}"`);
    }
    const productsV2ReadyBadge = await page.locator('.vwc-list-item', { hasText: 'v2 (ready for review mock)' }).locator('.vwc-badge').innerText();
    if (normalizeBadgeText(productsV2ReadyBadge) !== 'ready for review') {
      throw new Error(`expected sibling products-v2-ready to remain "Ready for review", found "${productsV2ReadyBadge.trim()}"`);
    }
    const mutatedDraftItem = page.locator('.vwc-list-item', { hasText: newDraftLabel });
    const mutatedDraftBadge = await mutatedDraftItem.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(mutatedDraftBadge) !== 'changes requested') {
      throw new Error(`expected only the exact selected draft version to change status, found "${mutatedDraftBadge.trim()}"`);
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
    const productsV2BadgeAfterAttempt = await productsV2ReadyItem.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(productsV2BadgeAfterAttempt) !== 'ready for review') {
      throw new Error(`expected products-v2-ready status to be unaffected by the blocked cross-version review attempt, found "${productsV2BadgeAfterAttempt.trim()}"`);
    }
    const homeV2BadgeAfterAttempt = await homeV2DraftItem.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(homeV2BadgeAfterAttempt) !== 'draft') {
      throw new Error(`expected home-v2-draft status to be unaffected, found "${homeV2BadgeAfterAttempt.trim()}"`);
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

    // v3 slice (issue #131 bounded continuation): local source intake -> create
    // DRAFT from an exact selected source record + parent version -> lineage
    // visible in the comparison/provenance panel and in the decision JSON.
    const sourceLabelValue = 'Owner-supplied products hero reference';
    const sourceOriginValue = 'https://example-owner-reference.invalid/products-hero (text only, not fetched)';
    const sourceProvenanceValue = 'Owner shared this as inspiration for the products hero treatment; recorded for provenance only.';

    const addSourceBtn = page.locator('.vwc-action-btn.create-source');
    if (!(await addSourceBtn.isDisabled())) {
      throw new Error('expected "Add local source record" to be disabled before any source fields are filled in');
    }

    await page.locator('[aria-label="Source label"]').fill(sourceLabelValue);
    await page.locator('[aria-label="Source origin text"]').fill(sourceOriginValue);
    await page.locator('[aria-label="Source provenance notes"]').fill(sourceProvenanceValue);
    await page.locator('.vwc-source-form select').selectOption('FILE_REFERENCE');

    if (await addSourceBtn.isDisabled()) {
      throw new Error('expected "Add local source record" to enable once type/label/origin/provenance are all filled in');
    }
    await addSourceBtn.click();

    const newSourceRecord = page.locator('.vwc-source-record.is-selected');
    await newSourceRecord.waitFor({ state: 'visible', timeout: 5_000 });
    const newSourceId = (await newSourceRecord.locator('.vwc-version-id').innerText()).replace('source id:', '').trim();
    if (!newSourceId.startsWith('source-session-')) {
      throw new Error(`expected a generated source id, got "${newSourceId}"`);
    }
    const newSourceBadge = await newSourceRecord.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(newSourceBadge) !== 'unverified reference') {
      throw new Error(`expected a newly created source record to default to UNVERIFIED_REFERENCE, found "${newSourceBadge.trim()}"`);
    }
    const newSourceText = await newSourceRecord.innerText();
    for (const expected of [sourceLabelValue, sourceOriginValue, sourceProvenanceValue, 'File reference']) {
      if (!newSourceText.includes(expected)) {
        throw new Error(`expected the newly created source record to render "${expected}"`);
      }
    }

    console.log(`PASS health ${scenario.name} visual console source intake: a new local source record requires type/label/origin/provenance, defaults to UNVERIFIED_REFERENCE, and renders every field entered`);

    // Approve the currently selected parent version (products-v2-ready) so the
    // next step can prove a source-derived DRAFT never inherits APPROVED state.
    const parentVersionId = (await page.locator('.vwc-detail-header .vwc-version-id').innerText()).replace('version id:', '').trim();
    if (parentVersionId !== 'products-v2-ready') {
      throw new Error(`expected the parent version selection going into source-draft creation to still be products-v2-ready, found "${parentVersionId}"`);
    }
    await noteInput.fill('Approving products-v2-ready so the next source-derived DRAFT can be proven not to inherit APPROVED state.');
    await approveBtn.click();
    await page.locator('.vwc-detail-header .vwc-badge', { hasText: 'Approved' }).waitFor({ state: 'visible', timeout: 5_000 });

    const createDraftFromSourceBtn = page.locator('.vwc-action-btn.create-draft-from-source');
    if (await createDraftFromSourceBtn.isDisabled()) {
      throw new Error('expected "Create DRAFT from selected source" to be enabled once a source record is selected');
    }
    await createDraftFromSourceBtn.click();

    const sourceDraftItem = page.locator('.vwc-list-item.is-selected');
    await sourceDraftItem.waitFor({ state: 'visible', timeout: 5_000 });
    const sourceDraftLabel = (await sourceDraftItem.locator('.vwc-list-item-label').innerText()).trim();
    if (!sourceDraftLabel.includes('from source')) {
      throw new Error(`expected the newly created version label to reference its source, got "${sourceDraftLabel}"`);
    }
    await page.locator('.vwc-detail-header .vwc-badge', { hasText: 'Draft' }).waitFor({ state: 'visible', timeout: 5_000 });
    const sourceDraftVersionId = (await page.locator('.vwc-detail-header .vwc-version-id').innerText()).replace('version id:', '').trim();

    const sourceDraftTargetColumn = page.locator('.vwc-compare-section .vwc-compare-column', { hasText: 'Comparison target' });
    await sourceDraftTargetColumn.locator('.vwc-version-id', { hasText: 'products-v2-ready' }).waitFor({ state: 'visible', timeout: 5_000 });

    const provenancePanel = page.locator('.vwc-source-provenance');
    await provenancePanel.locator('.vwc-version-id', { hasText: newSourceId }).waitFor({ state: 'visible', timeout: 5_000 });
    const provenanceBadgeText = await provenancePanel.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(provenanceBadgeText) !== 'unverified reference') {
      throw new Error(`expected the linked source provenance panel to show UNVERIFIED_REFERENCE, found "${provenanceBadgeText.trim()}"`);
    }
    const provenanceText = await provenancePanel.innerText();
    if (!provenanceText.includes('File reference')) {
      throw new Error('expected the selected version source provenance panel to show the linked source type');
    }

    // Approving the parent must not have promoted the new DRAFT.
    const approvedBadgeOnNewDraftCount = await sourceDraftItem.locator('.vwc-badge', { hasText: 'Approved' }).count();
    if (approvedBadgeOnNewDraftCount !== 0) {
      throw new Error("a source-derived DRAFT must never inherit APPROVED state from its parent version");
    }

    console.log(`PASS health ${scenario.name} visual console source-to-DRAFT lineage: new version ${sourceDraftVersionId} is created as DRAFT (not inheriting the now-APPROVED parent's status), carries comparisonTargetId=products-v2-ready and sourceId=${newSourceId}, and the provenance panel renders the linked source`);

    // Review the source-derived draft so its decision record carries source/lineage
    // fields. Uses "Request changes" (not "Mark reference only") so the legacy
    // REFERENCE_ONLY seed-count invariant below stays meaningful — this version
    // must not become a fourth "Reference only" badge.
    await noteInput.fill('Automated smoke-test review note for the source-derived DRAFT.');
    await requestChangesBtn.click();
    await page.locator('.vwc-detail-header .vwc-badge', { hasText: 'Changes requested' }).waitFor({ state: 'visible', timeout: 5_000 });

    const latestDecisionRecord = page.locator('.vwc-decision-record').first();
    await latestDecisionRecord.waitFor({ state: 'visible', timeout: 5_000 });
    const latestDecisionText = await latestDecisionRecord.innerText();
    for (const expected of [newSourceId, 'FILE_REFERENCE', sourceLabelValue, sourceOriginValue, sourceProvenanceValue]) {
      if (!latestDecisionText.includes(expected)) {
        throw new Error(`expected the latest decision record to include the full source snapshot field "${expected}"`);
      }
    }

    // Sibling/legacy protection must still hold after the v3 flow.
    const referenceOnlyBadgeCountAfterV3 = await page.locator('.vwc-list-item .vwc-badge', { hasText: 'Reference only' }).count();
    if (referenceOnlyBadgeCountAfterV3 !== 3) {
      throw new Error(`expected exactly 3 untouched legacy REFERENCE_ONLY seed records after the v3 flow, found ${referenceOnlyBadgeCountAfterV3}`);
    }
    const homeV2DraftBadgeAfterV3 = await homeV2DraftItem.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(homeV2DraftBadgeAfterV3) !== 'draft') {
      throw new Error(`expected sibling home-v2-draft to remain untouched "Draft" after the v3 flow, found "${homeV2DraftBadgeAfterV3.trim()}"`);
    }
    const mutatedDraftBadgeAfterV3 = await mutatedDraftItem.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(mutatedDraftBadgeAfterV3) !== 'changes requested') {
      throw new Error(`expected the earlier-reviewed draft to remain untouched "Changes requested" after the v3 flow, found "${mutatedDraftBadgeAfterV3.trim()}"`);
    }

    console.log(`PASS health ${scenario.name} visual console v3 sibling protection: legacy REFERENCE_ONLY seeds and previously reviewed sibling versions are unchanged after the source-intake flow`);

    // Copy/Download JSON must include the source/lineage fields for the source-derived decision.
    await latestDecisionRecord.locator('.vwc-action-btn.copy').click();
    await latestDecisionRecord.locator('.vwc-action-btn.copy', { hasText: 'Copied!' }).waitFor({ state: 'visible', timeout: 5_000 });
    const latestCopiedRaw = await page.evaluate(() => window.__vwcCopiedText);
    let latestCopiedDecision;
    try {
      latestCopiedDecision = JSON.parse(latestCopiedRaw);
    } catch (error) {
      throw new Error(`Copy JSON clipboard payload for the source-derived decision was not valid JSON: ${error.message}`);
    }
    if (latestCopiedDecision.selectedVersionId !== sourceDraftVersionId) {
      throw new Error('Copy JSON payload for the source-derived decision does not match the visible decision record selected version id');
    }
    if (
      latestCopiedDecision.sourceId !== newSourceId ||
      latestCopiedDecision.sourceType !== 'FILE_REFERENCE' ||
      latestCopiedDecision.sourceLabel !== sourceLabelValue ||
      latestCopiedDecision.sourceOriginText !== sourceOriginValue ||
      latestCopiedDecision.sourceProvenanceNotes !== sourceProvenanceValue
    ) {
      throw new Error('Copy JSON payload for the source-derived decision is missing the exact source snapshot (id/type/label/origin/provenance)');
    }

    const [sourceDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.vwc-action-btn.download', { hasText: 'Download all as JSON' }).click(),
    ]);
    const sourceDownloadStream = await sourceDownload.createReadStream();
    const sourceDownloadChunks = [];
    for await (const chunk of sourceDownloadStream) sourceDownloadChunks.push(chunk);
    const sourceDownloadedDecisions = JSON.parse(Buffer.concat(sourceDownloadChunks).toString('utf-8'));
    const sourceDownloadedDecision = sourceDownloadedDecisions.find((d) => d.decisionId === latestCopiedDecision.decisionId);
    if (
      !sourceDownloadedDecision ||
      sourceDownloadedDecision.sourceId !== newSourceId ||
      sourceDownloadedDecision.sourceType !== 'FILE_REFERENCE' ||
      sourceDownloadedDecision.sourceLabel !== sourceLabelValue ||
      sourceDownloadedDecision.sourceOriginText !== sourceOriginValue ||
      sourceDownloadedDecision.sourceProvenanceNotes !== sourceProvenanceValue
    ) {
      throw new Error('downloaded decisions JSON does not include the exact source snapshot (id/type/label/origin/provenance) for the source-derived decision');
    }

    console.log(`PASS health ${scenario.name} visual console source lineage in decision JSON: Copy JSON and Download JSON both include the full source snapshot (sourceId=${newSourceId}, sourceType=FILE_REFERENCE, label/origin/provenance) for the source-derived decision, independent of the session-local source record`);

    // v4 slice (issue #131 bounded continuation): local Iteration Brief ->
    // "Create next DRAFT from brief" -> brief/lineage visible in the
    // comparison panel and in the decision JSON. Select the now-APPROVED
    // products-v2-ready version so the DRAFT-never-inherits-APPROVED
    // invariant is exercised on a genuinely non-DRAFT parent.
    await productsV2ReadyItem.click();
    await page.locator('.vwc-detail-header .vwc-version-id', { hasText: 'products-v2-ready' }).waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.vwc-detail-header .vwc-badge', { hasText: 'Approved' }).waitFor({ state: 'visible', timeout: 5_000 });

    const createBriefBtn = page.locator('.vwc-action-btn.create-brief');
    if (!(await createBriefBtn.isDisabled())) {
      throw new Error('expected "Create iteration brief" to be disabled before objective/required changes are filled in');
    }

    const briefObjectiveValue = 'Tighten the hero layout spacing for products-v2-ready.';
    const briefRequiredChangesValue = 'Reduce hero vertical padding and align card row spacing with the comparison target.';
    const briefPreserveValue = 'Keep the existing chip filter behaviour and product card copy unchanged.';
    const briefAcceptanceValue = 'Owner confirms hero spacing visually matches the comparison target at desktop and mobile widths.';

    await page.locator('[aria-label="Iteration objective"]').fill(briefObjectiveValue);
    await page.locator('[aria-label="Required changes"]').fill(briefRequiredChangesValue);
    await page.locator('[aria-label="Preserve constraints"]').fill(briefPreserveValue);
    await page.locator('[aria-label="Acceptance notes"]').fill(briefAcceptanceValue);

    if (await createBriefBtn.isDisabled()) {
      throw new Error('expected "Create iteration brief" to enable once objective and required changes are filled in');
    }
    await createBriefBtn.click();

    const newBriefRecord = page.locator('.vwc-iteration-brief-section .vwc-source-record.is-selected');
    await newBriefRecord.waitFor({ state: 'visible', timeout: 5_000 });
    const newBriefId = (await newBriefRecord.locator('.vwc-source-record-label').innerText()).trim();
    if (!newBriefId.startsWith('brief-session-')) {
      throw new Error(`expected a generated iteration brief id, got "${newBriefId}"`);
    }
    const newBriefBadge = await newBriefRecord.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(newBriefBadge) !== 'iteration brief draft') {
      throw new Error(`expected a newly created iteration brief to default to ITERATION_BRIEF_DRAFT, found "${newBriefBadge.trim()}"`);
    }
    const newBriefText = await newBriefRecord.innerText();
    for (const expected of ['products-v2-ready', 'products-v1-reference', briefObjectiveValue, briefRequiredChangesValue, briefPreserveValue, briefAcceptanceValue]) {
      if (!newBriefText.includes(expected)) {
        throw new Error(`expected the newly created iteration brief to render "${expected}"`);
      }
    }
    if (newBriefText.includes('source id:')) {
      throw new Error('expected the iteration brief created against products-v2-ready (no linked source) to omit a source id binding');
    }

    console.log(`PASS health ${scenario.name} visual console iteration brief creation: "Create iteration brief" is disabled until objective/required changes are filled in, defaults to ITERATION_BRIEF_DRAFT, and binds the exact selected version id (products-v2-ready) and comparison target id (products-v1-reference)`);

    const createDraftFromBriefBtn = page.locator('.vwc-action-btn.create-draft-from-brief');
    if (await createDraftFromBriefBtn.isDisabled()) {
      throw new Error('expected "Create next DRAFT from brief" to be enabled once an iteration brief is selected');
    }
    await createDraftFromBriefBtn.click();

    const briefDraftItem = page.locator('.vwc-list-item.is-selected');
    await briefDraftItem.waitFor({ state: 'visible', timeout: 5_000 });
    const briefDraftLabel = (await briefDraftItem.locator('.vwc-list-item-label').innerText()).trim();
    if (!briefDraftLabel.includes('from brief')) {
      throw new Error(`expected the newly created version label to reference its iteration brief, got "${briefDraftLabel}"`);
    }
    const briefDraftBadge = await briefDraftItem.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(briefDraftBadge) !== 'draft') {
      throw new Error(`a brief-derived DRAFT must never inherit APPROVED/READY_FOR_REVIEW state from its parent version, found "${briefDraftBadge.trim()}"`);
    }
    const briefDraftVersionId = (await page.locator('.vwc-detail-header .vwc-version-id').innerText()).replace('version id:', '').trim();

    const briefDraftTargetColumn = page.locator('.vwc-compare-section .vwc-compare-column', { hasText: 'Comparison target' });
    await briefDraftTargetColumn.locator('.vwc-version-id', { hasText: 'products-v2-ready' }).waitFor({ state: 'visible', timeout: 5_000 });

    const briefLineagePanel = page.locator('.vwc-iteration-brief-lineage');
    await briefLineagePanel.locator('.vwc-version-id', { hasText: newBriefId }).waitFor({ state: 'visible', timeout: 5_000 });
    const briefLineageText = await briefLineagePanel.innerText();
    for (const expected of [briefObjectiveValue, briefRequiredChangesValue, 'products-v2-ready', 'products-v1-reference']) {
      if (!briefLineageText.includes(expected)) {
        throw new Error(`expected the selected version iteration brief lineage panel to show "${expected}"`);
      }
    }

    // Sibling/legacy protection must still hold after the v4 flow.
    const referenceOnlyBadgeCountAfterV4 = await page.locator('.vwc-list-item .vwc-badge', { hasText: 'Reference only' }).count();
    if (referenceOnlyBadgeCountAfterV4 !== 3) {
      throw new Error(`expected exactly 3 untouched legacy REFERENCE_ONLY seed records after the v4 flow, found ${referenceOnlyBadgeCountAfterV4}`);
    }
    const homeV2DraftBadgeAfterV4 = await homeV2DraftItem.locator('.vwc-badge').innerText();
    if (normalizeBadgeText(homeV2DraftBadgeAfterV4) !== 'draft') {
      throw new Error(`expected sibling home-v2-draft to remain untouched "Draft" after the v4 flow, found "${homeV2DraftBadgeAfterV4.trim()}"`);
    }

    console.log(`PASS health ${scenario.name} visual console iteration-brief-to-DRAFT lineage: new version ${briefDraftVersionId} is created as DRAFT (not inheriting the APPROVED parent's status), carries comparisonTargetId=products-v2-ready and iterationBriefId=${newBriefId}, and the lineage panel renders the linked brief`);

    // Review the brief-derived draft so its decision record carries the iteration-brief snapshot.
    await noteInput.fill('Automated smoke-test review note for the brief-derived DRAFT.');
    await requestChangesBtn.click();
    await page.locator('.vwc-detail-header .vwc-badge', { hasText: 'Changes requested' }).waitFor({ state: 'visible', timeout: 5_000 });

    const briefDecisionRecord = page.locator('.vwc-decision-record').first();
    await briefDecisionRecord.waitFor({ state: 'visible', timeout: 5_000 });
    const briefDecisionText = await briefDecisionRecord.innerText();
    for (const expected of [newBriefId, briefObjectiveValue, briefRequiredChangesValue, briefPreserveValue, briefAcceptanceValue]) {
      if (!briefDecisionText.includes(expected)) {
        throw new Error(`expected the latest decision record to include the iteration brief snapshot field "${expected}"`);
      }
    }

    await briefDecisionRecord.locator('.vwc-action-btn.copy').click();
    await briefDecisionRecord.locator('.vwc-action-btn.copy', { hasText: 'Copied!' }).waitFor({ state: 'visible', timeout: 5_000 });
    const briefCopiedRaw = await page.evaluate(() => window.__vwcCopiedText);
    let briefCopiedDecision;
    try {
      briefCopiedDecision = JSON.parse(briefCopiedRaw);
    } catch (error) {
      throw new Error(`Copy JSON clipboard payload for the brief-derived decision was not valid JSON: ${error.message}`);
    }
    if (
      briefCopiedDecision.selectedVersionId !== briefDraftVersionId ||
      briefCopiedDecision.iterationBriefId !== newBriefId ||
      briefCopiedDecision.iterationBriefObjective !== briefObjectiveValue ||
      briefCopiedDecision.iterationBriefRequiredChanges !== briefRequiredChangesValue ||
      briefCopiedDecision.iterationBriefPreserveConstraints !== briefPreserveValue ||
      briefCopiedDecision.iterationBriefAcceptanceNotes !== briefAcceptanceValue
    ) {
      throw new Error('Copy JSON payload for the brief-derived decision is missing the exact iteration brief snapshot');
    }

    const [briefDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.vwc-action-btn.download', { hasText: 'Download all as JSON' }).click(),
    ]);
    const briefDownloadStream = await briefDownload.createReadStream();
    const briefDownloadChunks = [];
    for await (const chunk of briefDownloadStream) briefDownloadChunks.push(chunk);
    const briefDownloadedDecisions = JSON.parse(Buffer.concat(briefDownloadChunks).toString('utf-8'));
    const briefDownloadedDecision = briefDownloadedDecisions.find((d) => d.decisionId === briefCopiedDecision.decisionId);
    if (
      !briefDownloadedDecision ||
      briefDownloadedDecision.iterationBriefId !== newBriefId ||
      briefDownloadedDecision.iterationBriefObjective !== briefObjectiveValue ||
      briefDownloadedDecision.iterationBriefRequiredChanges !== briefRequiredChangesValue
    ) {
      throw new Error('downloaded decisions JSON does not include the exact iteration brief snapshot for the brief-derived decision');
    }

    const v4Overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (v4Overflow) {
      throw new Error('visual console v4 flow (iteration brief / create draft from brief / decision record) has horizontal overflow');
    }

    console.log(`PASS health ${scenario.name} visual console iteration brief lineage in decision JSON: Copy JSON and Download JSON both include the full iteration brief snapshot (briefId=${newBriefId}) for the brief-derived decision, no horizontal overflow`);

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
      throw new Error('expected the locally created DRAFT versions (plain and source-derived) to be discarded after reload');
    }

    const sourceRecordsAfterReload = await page.locator('.vwc-source-record').count();
    if (sourceRecordsAfterReload !== 0) {
      throw new Error(`expected 0 local source records after reload, found ${sourceRecordsAfterReload}`);
    }
    await page.locator('.vwc-source-intake-section', { hasText: 'No local source records yet this session.' }).waitFor({ state: 'visible', timeout: 5_000 });
    const sourceLabelInputAfterReload = await page.locator('[aria-label="Source label"]').inputValue();
    if (sourceLabelInputAfterReload !== '') {
      throw new Error(`expected the source intake label field to reset after reload, found "${sourceLabelInputAfterReload}"`);
    }
    const addSourceBtnAfterReload = page.locator('.vwc-action-btn.create-source');
    if (!(await addSourceBtnAfterReload.isDisabled())) {
      throw new Error('expected "Add local source record" to be disabled again after reload clears the intake form');
    }
    const createDraftFromSourceBtnAfterReload = page.locator('.vwc-action-btn.create-draft-from-source');
    if (!(await createDraftFromSourceBtnAfterReload.isDisabled())) {
      throw new Error('expected "Create DRAFT from selected source" to be disabled again after reload clears the selected source');
    }

    const briefsAfterReload = await page.locator('.vwc-iteration-brief-section .vwc-source-record').count();
    if (briefsAfterReload !== 0) {
      throw new Error(`expected 0 local iteration briefs after reload, found ${briefsAfterReload}`);
    }
    await page.locator('.vwc-iteration-brief-section', { hasText: 'No local iteration briefs yet this session.' }).waitFor({ state: 'visible', timeout: 5_000 });
    const briefObjectiveInputAfterReload = await page.locator('[aria-label="Iteration objective"]').inputValue();
    if (briefObjectiveInputAfterReload !== '') {
      throw new Error(`expected the iteration brief objective field to reset after reload, found "${briefObjectiveInputAfterReload}"`);
    }
    const createBriefBtnAfterReload = page.locator('.vwc-action-btn.create-brief');
    if (!(await createBriefBtnAfterReload.isDisabled())) {
      throw new Error('expected "Create iteration brief" to be disabled again after reload clears the brief form');
    }
    const createDraftFromBriefBtnAfterReload = page.locator('.vwc-action-btn.create-draft-from-brief');
    if (!(await createDraftFromBriefBtnAfterReload.isDisabled())) {
      throw new Error('expected "Create next DRAFT from brief" to be disabled again after reload clears the selected brief');
    }

    const homeV1BadgeAfterReload = await page.locator('.vwc-list-item', { hasText: 'v1 (legacy reference capture)' }).first().locator('.vwc-badge').innerText();
    if (normalizeBadgeText(homeV1BadgeAfterReload) !== 'reference only') {
      throw new Error(`expected a legacy reference seed version to read "Reference only" after reload, found "${homeV1BadgeAfterReload.trim()}"`);
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

    console.log(`PASS health ${scenario.name} visual console reload: decisions, locally created source records/briefs/drafts and the intake/brief forms are discarded, seed versions and statuses are restored, no horizontal overflow`);
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
