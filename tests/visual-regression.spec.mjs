import { test, expect, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';

const scenarios = [
  { name: 'desktop', context: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', context: devices['iPhone 13'] },
];

const routes = [
  { name: 'homepage', path: '/' },
  { name: 'products', path: '/products' },
  { name: 'sleep-app', path: '/sleep-app' },
];

for (const scenario of scenarios) {
  for (const route of routes) {
    test(`${scenario.name} ${route.name}`, async ({ browser }) => {
      const context = await browser.newContext(scenario.context);
      const page = await context.newPage();

      const response = await page.goto(`${baseURL}${route.path}`, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });

      expect(response?.ok(), `${route.name} should return a successful HTTP response`).toBeTruthy();
      await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 });

      await expect(page).toHaveScreenshot(`${scenario.name}-${route.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });

      await context.close();
    });
  }
}
