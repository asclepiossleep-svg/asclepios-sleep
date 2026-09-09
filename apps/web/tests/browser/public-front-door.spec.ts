import { expect, test } from "@playwright/test";

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("public front door renders and exposes real primary routes", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('a[href="/products"]').first()).toBeVisible();
  await expect(page.locator('a[href="/sleep-app"]').first()).toBeVisible();

  await assertNoHorizontalOverflow(page);

  await page.screenshot({ path: `test-results/front-door-${test.info().project.name}.png`, fullPage: true });
});

test("products route is reachable from the public front door", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/products"]').first().click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator("main")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("sleep app route is reachable from the public front door", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/sleep-app"]').first().click();
  await expect(page).toHaveURL(/\/sleep-app$/);
  await expect(page.locator("main")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
