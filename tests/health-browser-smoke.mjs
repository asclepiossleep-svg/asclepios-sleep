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

    // No invariant warning on the pristine seeded dataset.
    if (await page.locator('.ooc-invariant-warning').count() > 0) {
      throw new Error('ops console shows an invariant warning on pristine seed data');
    }

    const summaryLabels = ['Orders needing action', 'Fulfilment exceptions', 'Returns / refunds pending'];
    for (const label of summaryLabels) {
      await page.locator('.ooc-summary-card', { hasText: label }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    const summaryValue = async (label) =>
      Number((await page.locator('.ooc-summary-card', { hasText: label }).locator('.ooc-summary-value').innerText()).trim());

    const initialNeedingAction = await summaryValue('Orders needing action');
    const initialFulfilmentExceptions = await summaryValue('Fulfilment exceptions');
    const initialReturnsRefundsPending = await summaryValue('Returns / refunds pending');
    if (initialNeedingAction !== 3 || initialFulfilmentExceptions !== 1 || initialReturnsRefundsPending !== 1) {
      throw new Error(
        `unexpected seed summary counters: needingAction=${initialNeedingAction} fulfilmentExceptions=${initialFulfilmentExceptions} returnsRefundsPending=${initialReturnsRefundsPending}`
      );
    }

    // Sibling order DEMO-ORD-1001 (clean happy-path reference run) must stay
    // untouched by any action taken against a different order below.
    const sibling1001Row = () => page.locator('.ooc-list-row', { hasText: 'DEMO-ORD-1001' }).first();
    await sibling1001Row().locator('.ooc-chip.status-DELIVERED').waitFor({ state: 'visible', timeout: 5_000 });

    await page.locator('.ooc-list-row', { hasText: 'DEMO-ORD-1003' }).first().click();
    await page.locator('.ooc-detail h2', { hasText: 'DEMO-ORD-1003' }).waitFor({ state: 'visible', timeout: 5_000 });

    for (const label of ['Order', 'Payment', 'Inventory', 'Fulfilment', 'Delivery', 'Entitlement', 'Support']) {
      await page.locator('.ooc-chain-label', { hasText: label }).waitFor({ state: 'visible', timeout: 5_000 });
    }

    // Exact selected-order detail rendering for DEMO-ORD-1003's seeded exception state.
    await page.locator('.ooc-chain-step', { hasText: 'Order' }).locator('.ooc-chip.status-ON_HOLD').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Fulfilment' }).locator('.ooc-chip.fulfilment-REJECTED').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Delivery' }).locator('.ooc-chip.delivery-EXCEPTION').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Support' }).locator('.ooc-chip.support-CASE_OPEN').waitFor({ state: 'visible', timeout: 5_000 });

    // --- Demo scenario rule 1: resolve fulfilment exception (atomic transition) ---
    await page.locator('.ooc-action-btn', { hasText: 'Resolve fulfilment exception' }).click();

    await page.locator('.ooc-chain-step', { hasText: 'Order' }).locator('.ooc-chip.status-DISPATCHED').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Fulfilment' }).locator('.ooc-chip.fulfilment-DISPATCHED').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Delivery' }).locator('.ooc-chip.delivery-IN_TRANSIT').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Support' }).locator('.ooc-chip.support-NONE').waitFor({ state: 'visible', timeout: 5_000 });

    const afterResolveNeedingAction = await summaryValue('Orders needing action');
    const afterResolveFulfilmentExceptions = await summaryValue('Fulfilment exceptions');
    const afterResolveReturnsRefundsPending = await summaryValue('Returns / refunds pending');
    if (afterResolveNeedingAction !== 2 || afterResolveFulfilmentExceptions !== 0 || afterResolveReturnsRefundsPending !== 1) {
      throw new Error(
        `unexpected summary counters after resolving fulfilment exception: needingAction=${afterResolveNeedingAction} fulfilmentExceptions=${afterResolveFulfilmentExceptions} returnsRefundsPending=${afterResolveReturnsRefundsPending}`
      );
    }

    // Sibling order untouched by the action against DEMO-ORD-1003.
    await sibling1001Row().locator('.ooc-chip.status-DELIVERED').waitFor({ state: 'visible', timeout: 5_000 });

    // One timeline event for this action with exact before/after snapshot and LOCAL_PREVIEW_ONLY scope.
    const eventItems = page.locator('.ooc-event-item');
    if ((await eventItems.count()) !== 1) {
      throw new Error(`expected exactly 1 event after one action, found ${await eventItems.count()}`);
    }
    const firstEvent = eventItems.nth(0);
    await firstEvent.locator('.ooc-event-meta', { hasText: 'Resolve fulfilment exception' }).waitFor({ state: 'visible', timeout: 5_000 });
    await firstEvent.locator('.ooc-event-meta', { hasText: 'DEMO-ORD-1003' }).waitFor({ state: 'visible', timeout: 5_000 });
    await firstEvent.locator('.ooc-event-meta', { hasText: 'DEMO_OPERATOR' }).waitFor({ state: 'visible', timeout: 5_000 });
    await firstEvent.locator('.ooc-event-meta', { hasText: 'LOCAL_PREVIEW_ONLY' }).waitFor({ state: 'visible', timeout: 5_000 });
    await firstEvent.locator('summary').click();
    const firstEventSnapshot = await firstEvent.locator('pre').innerText();
    for (const expected of ['"fulfilmentStatus": "REJECTED"', '"fulfilmentStatus": "DISPATCHED"', '"supportStatus": "CASE_OPEN"', '"supportStatus": "NONE"']) {
      if (!firstEventSnapshot.includes(expected)) {
        throw new Error(`event snapshot missing expected field ${expected}: ${firstEventSnapshot}`);
      }
    }

    // --- Demo scenario rule 2: complete demo refund (atomic transition) ---
    await page.locator('.ooc-list-row', { hasText: 'DEMO-ORD-1005' }).first().click();
    await page.locator('.ooc-detail h2', { hasText: 'DEMO-ORD-1005' }).waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Entitlement' }).locator('.ooc-chip.entitlement-ACTIVATED').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Inventory' }).locator('.ooc-chip.inventory-COMMITTED').waitFor({ state: 'visible', timeout: 5_000 });

    await page.locator('.ooc-action-btn', { hasText: 'Complete demo refund' }).click();

    await page.locator('.ooc-chain-step', { hasText: 'Order' }).locator('.ooc-chip.status-REFUNDED').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Payment' }).locator('.ooc-chip.payment-REFUNDED').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Inventory' }).locator('.ooc-chip.inventory-RELEASED').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Entitlement' }).locator('.ooc-chip.entitlement-EXPIRED').waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.ooc-chain-step', { hasText: 'Support' }).locator('.ooc-chip.support-REFUND_SUCCEEDED').waitFor({ state: 'visible', timeout: 5_000 });

    // No contradictory active entitlement / reserved inventory remains for this order.
    if (await page.locator('.ooc-chain-step', { hasText: 'Entitlement' }).locator('.ooc-chip.entitlement-ACTIVATED').count() > 0) {
      throw new Error('entitlement still shows ACTIVATED after a completed demo refund');
    }
    if (await page.locator('.ooc-chain-step', { hasText: 'Inventory' }).locator('.ooc-chip.inventory-COMMITTED').count() > 0) {
      throw new Error('inventory still shows COMMITTED after a completed demo refund');
    }
    if (await page.locator('.ooc-invariant-warning').count() > 0) {
      throw new Error('ops console shows an invariant warning after a correctly-atomic refund action');
    }

    const afterRefundNeedingAction = await summaryValue('Orders needing action');
    const afterRefundReturnsRefundsPending = await summaryValue('Returns / refunds pending');
    if (afterRefundNeedingAction !== 1 || afterRefundReturnsRefundsPending !== 0) {
      throw new Error(
        `unexpected summary counters after completing demo refund: needingAction=${afterRefundNeedingAction} returnsRefundsPending=${afterRefundReturnsRefundsPending}`
      );
    }

    // Sibling order still untouched after a second, different action.
    await sibling1001Row().locator('.ooc-chip.status-DELIVERED').waitFor({ state: 'visible', timeout: 5_000 });

    if ((await eventItems.count()) !== 2) {
      throw new Error(`expected exactly 2 events after two actions, found ${await eventItems.count()}`);
    }
    const secondEvent = eventItems.nth(1);
    await secondEvent.locator('.ooc-event-meta', { hasText: 'Complete demo refund' }).waitFor({ state: 'visible', timeout: 5_000 });
    await secondEvent.locator('.ooc-event-meta', { hasText: 'DEMO-ORD-1005' }).waitFor({ state: 'visible', timeout: 5_000 });
    await secondEvent.locator('summary').click();
    const secondEventSnapshot = await secondEvent.locator('pre').innerText();
    for (const expected of ['"entitlementStatus": "ACTIVATED"', '"entitlementStatus": "EXPIRED"', '"inventoryStatus": "COMMITTED"', '"inventoryStatus": "RELEASED"']) {
      if (!secondEventSnapshot.includes(expected)) {
        throw new Error(`refund event snapshot missing expected field ${expected}: ${secondEventSnapshot}`);
      }
    }

    // Reload must restore the original seeded state and remove all local events/actions.
    const reloadResponse = await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    if (!reloadResponse || !reloadResponse.ok()) {
      throw new Error(`ops console reload returned HTTP ${reloadResponse?.status() ?? 'no response'}`);
    }
    await page.locator('h1', { hasText: 'Owner Operations Console' }).waitFor({ state: 'visible', timeout: 10_000 });
    if ((await page.locator('.ooc-event-item').count()) !== 0) {
      throw new Error('ops console retained local events across a reload');
    }
    await page.locator('.ooc-list-row', { hasText: 'DEMO-ORD-1005' }).first().locator('.ooc-chip.status-RETURN_REQUESTED').waitFor({ state: 'visible', timeout: 5_000 });
    const resetNeedingAction = await summaryValue('Orders needing action');
    const resetFulfilmentExceptions = await summaryValue('Fulfilment exceptions');
    const resetReturnsRefundsPending = await summaryValue('Returns / refunds pending');
    if (resetNeedingAction !== 3 || resetFulfilmentExceptions !== 1 || resetReturnsRefundsPending !== 1) {
      throw new Error(
        `ops console did not reset to seeded summary counters on reload: needingAction=${resetNeedingAction} fulfilmentExceptions=${resetFulfilmentExceptions} returnsRefundsPending=${resetReturnsRefundsPending}`
      );
    }

    // --- Exception ownership & reconciliation queue (OWNER-OPS-DEMO-EXCEPTION-QUEUE-001) ---
    const oeqRoot = page.locator('.oeq-root');
    await oeqRoot.locator('h2', { hasText: 'Exception ownership' }).waitFor({ state: 'visible', timeout: 5_000 });

    const exceptionSummaryValue = async (label) =>
      Number((await oeqRoot.locator('.ooc-summary-card', { hasText: label }).locator('.ooc-summary-value').innerText()).trim());

    const initialOpen = await exceptionSummaryValue('Open');
    const initialRetryRecorded = await exceptionSummaryValue('Retry recorded');
    const initialReconciled = await exceptionSummaryValue('Reconciled');
    if (initialOpen !== 3 || initialRetryRecorded !== 0 || initialReconciled !== 0) {
      throw new Error(
        `unexpected seed exception queue counters: open=${initialOpen} retryRecorded=${initialRetryRecorded} reconciled=${initialReconciled}`
      );
    }

    // Sibling exception EXC-1007 (derived from unrelated order DEMO-ORD-1007) must stay
    // untouched by any action taken against EXC-1003 below.
    const sibling1007Row = () => oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1007' }).first();
    await sibling1007Row().locator('.oeq-status-OPEN').waitFor({ state: 'visible', timeout: 5_000 });
    await sibling1007Row().locator('.oeq-owner-UNASSIGNED').waitFor({ state: 'visible', timeout: 5_000 });

    // Exact derived exception/order binding.
    await oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1003' }).first().click();
    await oeqRoot.locator('.ooc-detail h3', { hasText: 'EXC-1003' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.ooc-detail-sub', { hasText: 'DEMO-ORD-1003' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.ooc-detail-sub', { hasText: 'Fulfilment exception' }).waitFor({ state: 'visible', timeout: 5_000 });

    // NOT_CONNECTED provider acknowledgement and LOCAL_PREVIEW_ONLY scope are visible,
    // never implying a real provider/API call.
    await oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1003' }).first().locator('.oeq-provider-ack', { hasText: 'NOT_CONNECTED' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.oeq-provider-ack', { hasText: 'NOT_CONNECTED' }).first().waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.oeq-scope', { hasText: 'LOCAL_PREVIEW_ONLY' }).waitFor({ state: 'visible', timeout: 5_000 });

    // Required owner/note validation: every action starts disabled with no role chosen / empty notes.
    const assignButton = oeqRoot.locator('button', { hasText: 'Assign owner' });
    const retryButton = oeqRoot.locator('button', { hasText: 'Record retry' });
    const reconcileButton = oeqRoot.locator('button', { hasText: 'Mark reconciled' });
    if (!(await assignButton.isDisabled())) throw new Error('assign-owner button should start disabled with no role chosen');
    if (!(await retryButton.isDisabled())) throw new Error('record-retry button should start disabled with an empty note');
    if (!(await reconcileButton.isDisabled())) throw new Error('mark-reconciled button should start disabled with an empty note');

    // --- Sequence step 1: assign a demo owner role ---
    await oeqRoot.locator('#oeq-owner-select').selectOption('DEMO_OPS');
    if (await assignButton.isDisabled()) throw new Error('assign-owner button should enable once a role is chosen');
    await assignButton.click();

    await oeqRoot.locator('.ooc-chain-step', { hasText: 'Owner' }).locator('.oeq-owner-DEMO_OPS', { hasText: 'Demo Ops' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1003' }).first().locator('.oeq-owner-DEMO_OPS').waitFor({ state: 'visible', timeout: 5_000 });

    if ((await page.locator('.ooc-event-item').count()) !== 1) {
      throw new Error(`expected exactly 1 event after assigning an owner, found ${await page.locator('.ooc-event-item').count()}`);
    }
    let oeqEvent = page.locator('.ooc-event-item').nth(0);
    await oeqEvent.locator('.ooc-event-meta', { hasText: 'Assign owner' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqEvent.locator('.ooc-event-meta', { hasText: 'DEMO-ORD-1003' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqEvent.locator('.ooc-event-meta', { hasText: 'EXC-1003' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqEvent.locator('.ooc-event-meta', { hasText: 'DEMO_OPERATOR' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqEvent.locator('.ooc-event-meta', { hasText: 'LOCAL_PREVIEW_ONLY' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqEvent.locator('summary').click();
    let oeqSnapshot = await oeqEvent.locator('pre').innerText();
    for (const expected of ['"ownerRole": null', '"ownerRole": "DEMO_OPS"']) {
      if (!oeqSnapshot.includes(expected)) throw new Error(`assign-owner event snapshot missing expected field ${expected}: ${oeqSnapshot}`);
    }

    // --- Sequence step 2: record a local retry attempt ---
    await oeqRoot.locator('#oeq-retry-note').fill('Pinged the demo 3PL adapter to re-request fulfilment handoff.');
    if (await retryButton.isDisabled()) throw new Error('record-retry button should enable once a non-empty note is entered');
    await retryButton.click();

    await oeqRoot.locator('.ooc-chain-step', { hasText: 'Status' }).locator('.oeq-status-RETRY_RECORDED').waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1003' }).first().locator('.oeq-status-RETRY_RECORDED').waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.ooc-section', { hasText: 'Last local attempt' }).locator('p', { hasText: 'SIMULATED_ONLY' }).waitFor({ state: 'visible', timeout: 5_000 });

    const afterRetryOpen = await exceptionSummaryValue('Open');
    const afterRetryRetryRecorded = await exceptionSummaryValue('Retry recorded');
    if (afterRetryOpen !== 2 || afterRetryRetryRecorded !== 1) {
      throw new Error(`unexpected exception queue counters after recording a retry: open=${afterRetryOpen} retryRecorded=${afterRetryRetryRecorded}`);
    }

    // Sibling exception and sibling order remain unaffected by action against EXC-1003.
    await sibling1007Row().locator('.oeq-status-OPEN').waitFor({ state: 'visible', timeout: 5_000 });
    await sibling1001Row().locator('.ooc-chip.status-DELIVERED').waitFor({ state: 'visible', timeout: 5_000 });

    if ((await page.locator('.ooc-event-item').count()) !== 2) {
      throw new Error(`expected exactly 2 events after recording a retry, found ${await page.locator('.ooc-event-item').count()}`);
    }
    oeqEvent = page.locator('.ooc-event-item').nth(1);
    await oeqEvent.locator('.ooc-event-meta', { hasText: 'Record retry attempt' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqEvent.locator('summary').click();
    oeqSnapshot = await oeqEvent.locator('pre').innerText();
    for (const expected of ['"status": "OPEN"', '"status": "RETRY_RECORDED"']) {
      if (!oeqSnapshot.includes(expected)) throw new Error(`record-retry event snapshot missing expected field ${expected}: ${oeqSnapshot}`);
    }

    // --- Sequence step 3: mark reconciled (requires a non-empty reconciliation note) ---
    if (!(await reconcileButton.isDisabled())) throw new Error('mark-reconciled button should remain disabled until a reconciliation note is entered');
    await oeqRoot.locator('#oeq-reconcile-note').fill('Shipment re-dispatched and confirmed with demo customer; closing locally.');
    if (await reconcileButton.isDisabled()) throw new Error('mark-reconciled button should enable once a non-empty reconciliation note is entered');
    await reconcileButton.click();

    await oeqRoot.locator('.ooc-chain-step', { hasText: 'Status' }).locator('.oeq-status-RECONCILED').waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.oeq-reconciled-banner', { hasText: 'Shipment re-dispatched and confirmed with demo customer; closing locally.' }).waitFor({ state: 'visible', timeout: 5_000 });

    const afterReconcileRetryRecorded = await exceptionSummaryValue('Retry recorded');
    const afterReconcileReconciled = await exceptionSummaryValue('Reconciled');
    if (afterReconcileRetryRecorded !== 0 || afterReconcileReconciled !== 1) {
      throw new Error(`unexpected exception queue counters after reconciling: retryRecorded=${afterReconcileRetryRecorded} reconciled=${afterReconcileReconciled}`);
    }

    // A reconciled exception must not disappear silently: it stays visible in the list
    // with its owner/status, and its full history (assign + retry + reconcile) is retained.
    await oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1003' }).first().locator('.oeq-status-RECONCILED').waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1003' }).first().locator('.oeq-owner-DEMO_OPS').waitFor({ state: 'visible', timeout: 5_000 });
    const historyItems = oeqRoot.locator('.ooc-section', { hasText: 'History' }).locator('.ooc-timeline li');
    if ((await historyItems.count()) !== 3) {
      throw new Error(`expected exactly 3 retained history entries after assign+retry+reconcile, found ${await historyItems.count()}`);
    }
    await oeqRoot.locator('.ooc-section', { hasText: 'History' }).locator('li', { hasText: 'SIMULATED_ONLY' }).waitFor({ state: 'visible', timeout: 5_000 });

    // Actions are disabled on a reconciled (closed, retained) exception.
    if (!(await assignButton.isDisabled())) throw new Error('assign-owner should be disabled once an exception is reconciled');
    if (!(await retryButton.isDisabled())) throw new Error('record-retry should be disabled once an exception is reconciled');
    if (!(await reconcileButton.isDisabled())) throw new Error('mark-reconciled should be disabled once an exception is reconciled');

    // Sibling exception/order remain untouched after the full assign->retry->reconcile sequence.
    await sibling1007Row().locator('.oeq-status-OPEN').waitFor({ state: 'visible', timeout: 5_000 });
    await sibling1007Row().locator('.oeq-owner-UNASSIGNED').waitFor({ state: 'visible', timeout: 5_000 });
    await sibling1001Row().locator('.ooc-chip.status-DELIVERED').waitFor({ state: 'visible', timeout: 5_000 });

    if ((await page.locator('.ooc-event-item').count()) !== 3) {
      throw new Error(`expected exactly 3 events after assign+retry+reconcile, found ${await page.locator('.ooc-event-item').count()}`);
    }
    oeqEvent = page.locator('.ooc-event-item').nth(2);
    await oeqEvent.locator('.ooc-event-meta', { hasText: 'Mark reconciled' }).waitFor({ state: 'visible', timeout: 5_000 });
    await oeqEvent.locator('summary').click();
    oeqSnapshot = await oeqEvent.locator('pre').innerText();
    for (const expected of ['"status": "RETRY_RECORDED"', '"status": "RECONCILED"', '"reconciliationNote": null', '"reconciliationNote": "Shipment re-dispatched']) {
      if (!oeqSnapshot.includes(expected)) throw new Error(`reconcile event snapshot missing expected field ${expected}: ${oeqSnapshot}`);
    }

    // Reload: exception queue resets fully — owners/attempts/notes/history/events all cleared.
    const exceptionReloadResponse = await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    if (!exceptionReloadResponse || !exceptionReloadResponse.ok()) {
      throw new Error(`ops console reload (exception queue check) returned HTTP ${exceptionReloadResponse?.status() ?? 'no response'}`);
    }
    await page.locator('h1', { hasText: 'Owner Operations Console' }).waitFor({ state: 'visible', timeout: 10_000 });
    if ((await page.locator('.ooc-event-item').count()) !== 0) {
      throw new Error('ops console retained exception-queue local events across a reload');
    }
    const resetOpenExceptions = await exceptionSummaryValue('Open');
    const resetRetryRecordedExceptions = await exceptionSummaryValue('Retry recorded');
    const resetReconciledExceptions = await exceptionSummaryValue('Reconciled');
    if (resetOpenExceptions !== 3 || resetRetryRecordedExceptions !== 0 || resetReconciledExceptions !== 0) {
      throw new Error(
        `exception queue did not reset to seeded counters on reload: open=${resetOpenExceptions} retryRecorded=${resetRetryRecordedExceptions} reconciled=${resetReconciledExceptions}`
      );
    }
    await oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1003' }).first().locator('.oeq-status-OPEN').waitFor({ state: 'visible', timeout: 5_000 });
    await oeqRoot.locator('.oeq-list-row', { hasText: 'EXC-1003' }).first().locator('.oeq-owner-UNASSIGNED').waitFor({ state: 'visible', timeout: 5_000 });

    if (pageErrors.length > 0) throw new Error(`uncaught browser error(s) on exception queue: ${pageErrors.join(' | ')}`);
    if (consoleErrors.length > 0) throw new Error(`console error(s) on exception queue: ${consoleErrors.join(' | ')}`);
    if (requestFailures.length > 0) throw new Error(`failed network request(s) on exception queue: ${requestFailures.join(' | ')}`);

    console.log(`PASS health ${scenario.name} exception queue: /internal/ops-console exception queue is derived from demo orders with exact order binding, NOT_CONNECTED/LOCAL_PREVIEW_ONLY/SIMULATED_ONLY labelled throughout; assign -> record retry -> reconcile all require valid owner/non-empty notes, apply atomically with consistent counters and sibling isolation, append exactly one event each with before/after snapshots; a reconciled exception stays visible with full retained history; reload clears events and restores the seeded queue; no runtime console errors or failed network requests`);

    // Re-select DEMO-ORD-1003 for the overflow screenshot below, matching prior behaviour.
    await page.locator('.ooc-list-row', { hasText: 'DEMO-ORD-1003' }).first().click();
    await page.locator('.ooc-detail h2', { hasText: 'DEMO-ORD-1003' }).waitFor({ state: 'visible', timeout: 5_000 });

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

    console.log(`PASS health ${scenario.name} ops console: /internal/ops-console renders summary cards + order list + lifecycle chain; resolve-fulfilment-exception and complete-demo-refund both apply atomically with consistent summary counters and sibling orders unaffected; each action appends exactly one LOCAL_PREVIEW_ONLY event with an exact before/after snapshot; a completed refund leaves no active entitlement or reserved inventory; no invariant warning on correct state; reload clears events and restores the seed; no horizontal overflow, no runtime console errors, no failed network requests`);
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
