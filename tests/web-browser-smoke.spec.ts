import { expect, test, type Page } from "@playwright/test";

const baseUrl = "http://127.0.0.1:4173";
const routes = [
  "/",
  "/products",
  "/products/sleep-support",
  "/products/calm-body",
  "/products/gut-mood",
  "/education",
  "/login",
];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

function captureBrowserFailures(page: Page) {
  const failures: string[] = [];

  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.push(`console.error: ${message.text()}`);
    }
  });

  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === baseUrl && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${url.pathname}`);
    }
  });

  return failures;
}

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route} renders cleanly without horizontal overflow`, async ({ page }, testInfo) => {
        const browserFailures = captureBrowserFailures(page);
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        expect(response, `${route} should return a browser response`).not.toBeNull();
        expect(response?.ok(), `${route} should return HTTP success`).toBeTruthy();

        await expect(page.locator("body")).toBeVisible();
        const bodyText = (await page.locator("body").innerText()).trim();
        expect(bodyText.length, `${route} should render visible content`).toBeGreaterThan(0);

        const overflowPixels = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflowPixels, `${route} must not overflow horizontally`).toBeLessThanOrEqual(1);
        expect(browserFailures, `${route} must not emit runtime, console, or same-origin HTTP errors`).toEqual([]);

        const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
        await page.screenshot({
          path: testInfo.outputPath(`${slug}-${viewport.name}.png`),
          fullPage: true,
        });
      });
    }

    test("invalid product id safely redirects to products", async ({ page }) => {
      const browserFailures = captureBrowserFailures(page);
      await page.goto(`${baseUrl}/products/not-a-real-product`, { waitUntil: "networkidle" });
      await expect(page).toHaveURL(`${baseUrl}/products`);
      await expect(page.locator("body")).toBeVisible();
      expect(browserFailures, "invalid product redirect must not emit browser failures").toEqual([]);
    });

    test("public locale switching survives navigation without overflow", async ({ page }) => {
      const browserFailures = captureBrowserFailures(page);
      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      const localeSelect = page.locator(".public-language select");
      await expect(localeSelect).toBeVisible();

      for (const locale of ["zh-HK", "zh-CN", "en"]) {
        await localeSelect.selectOption(locale);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);

        await page.goto(`${baseUrl}/products`, { waitUntil: "networkidle" });
        await expect(page.locator("html")).toHaveAttribute("lang", locale);

        const overflowPixels = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflowPixels, `${locale} /products must not overflow horizontally`).toBeLessThanOrEqual(1);

        await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      }

      expect(browserFailures, "locale flow must not emit browser failures").toEqual([]);
    });
  });
}
