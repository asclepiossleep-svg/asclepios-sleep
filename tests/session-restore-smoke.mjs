// Regression coverage for the session-restore error-classification fix
// (apps/web/src/state/session.tsx): an already-saved token must only be
// deleted on an authenticated 401, never on a transient failure (5xx or a
// network outage) during the initial GET /auth/session restore call.
// Exported for tests/browser-smoke.mjs, which drives the real built app in
// a real browser (desktop + iPhone profile) via the existing smoke gate —
// this intercepts /auth/session rather than asserting on source text or a
// duplicated helper.
import { devices } from 'playwright';

const TOKEN_KEY = 'asclepios.session.token';
const SEED_TOKEN = 'smoke-test-seed-token';
const SESSION_EXPIRED_EVENT = 'asclepios:session-expired';

const deviceScenarios = [
  { name: 'desktop', context: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', context: devices['iPhone 13'] },
];

const cases = [
  {
    name: '401-clears-token',
    fulfill: { status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_token' }) },
    expectTokenAfter: null,
    expectSessionExpiredEvent: true,
  },
  {
    name: '500-preserves-token',
    fulfill: { status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'internal_error' }) },
    expectTokenAfter: SEED_TOKEN,
    expectSessionExpiredEvent: false,
  },
  {
    name: 'network-failure-preserves-token',
    abort: true,
    expectTokenAfter: SEED_TOKEN,
    expectSessionExpiredEvent: false,
  },
];

async function runCase(browser, baseURL, outputDir, scenario, testCase) {
  const label = `session-restore-${scenario.name}-${testCase.name}`;
  const context = await browser.newContext(scenario.context);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(
    ([tokenKey, token, eventName]) => {
      window.localStorage.setItem(tokenKey, token);
      window.__sessionExpiredFired = false;
      window.addEventListener(eventName, () => {
        window.__sessionExpiredFired = true;
      });
    },
    [TOKEN_KEY, SEED_TOKEN, SESSION_EXPIRED_EVENT]
  );

  await page.route('**/auth/session', async (route) => {
    if (testCase.abort) {
      await route.abort('failed');
    } else {
      await route.fulfill(testCase.fulfill);
    }
  });

  try {
    await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForURL('**/login', { timeout: 10_000 });

    const tokenAfter = await page.evaluate((tokenKey) => window.localStorage.getItem(tokenKey), TOKEN_KEY);
    const sessionExpiredFired = await page.evaluate(() => window.__sessionExpiredFired);

    if (tokenAfter !== testCase.expectTokenAfter) {
      throw new Error(`expected persisted token ${JSON.stringify(testCase.expectTokenAfter)}, got ${JSON.stringify(tokenAfter)}`);
    }
    if (sessionExpiredFired !== testCase.expectSessionExpiredEvent) {
      throw new Error(`expected SESSION_EXPIRED_EVENT fired=${testCase.expectSessionExpiredEvent}, got ${sessionExpiredFired}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`uncaught browser error(s): ${pageErrors.join(' | ')}`);
    }

    await page.screenshot({ path: `${outputDir}/${label}.png`, fullPage: true });
    console.log(`PASS ${label}: persisted token ${JSON.stringify(tokenAfter)}, sessionExpiredFired=${sessionExpiredFired}`);
    await context.close();
    return true;
  } catch (error) {
    await page.screenshot({ path: `${outputDir}/${label}-failure.png`, fullPage: true }).catch(() => {});
    console.error(`FAIL ${label}: ${error.message}`);
    await context.close();
    return false;
  }
}

export async function verifySessionRestoreErrorClassification(browser, baseURL, outputDir) {
  let allPassed = true;
  for (const scenario of deviceScenarios) {
    for (const testCase of cases) {
      const passed = await runCase(browser, baseURL, outputDir, scenario, testCase);
      if (!passed) allPassed = false;
    }
  }
  return allPassed;
}
