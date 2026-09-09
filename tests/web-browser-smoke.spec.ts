import { expect, test } from "@playwright/test";

const baseUrl = "http://127.0.0.1:4173";
const routes = ["/", "/products", "/education", "/login"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route} renders without horizontal overflow`, async ({ page }, testInfo) => {
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

        const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
        await page.screenshot({
          path: testInfo.outputPath(`${slug}-${viewport.name}.png`),
          fullPage: true,
        });
      });
    }
  });
}
