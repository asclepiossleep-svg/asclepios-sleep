import { readFileSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { build } from "vite";

const root = new URL("../", import.meta.url);
const localePaths = [
  ["en", new URL("src/i18n/en.json", root)],
  ["zh-HK", new URL("src/i18n/zh-HK.json", root)],
  ["zh-CN", new URL("src/i18n/zh-CN.json", root)],
];
const locales = localePaths.map(([name, url]) => [
  name,
  JSON.parse(readFileSync(url, "utf8")),
]);
const [english] = locales[0].slice(1);

const expectedSurfaces = [
  ["/shop", "shop.previewBadge"],
  ["/shop/product", "shop.surface.product"],
  ["/shop/cart", "shop.surface.cart"],
  ["/shop/checkout", "shop.surface.checkout"],
  ["/shop/order", "shop.surface.order"],
  ["/shop/help", "shop.surface.help"],
];

const rootPath = fileURLToPath(root);
const testOutDir = ".shop-route-test";

await build({
  configFile: false,
  root: rootPath,
  logLevel: "silent",
  build: {
    ssr: "src/pages/Shop.tsx",
    outDir: testOutDir,
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: "shop.mjs" },
    },
  },
});

try {
  const bundleUrl = pathToFileURL(fileURLToPath(new URL(`${testOutDir}/shop.mjs`, root)));
  bundleUrl.searchParams.set("test", String(Date.now()));
  const { default: Shop } = await import(bundleUrl.href);

  function render(pathname) {
    return renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: [pathname] },
        React.createElement(Shop),
      ),
    );
  }

  for (const [pathname, headingKey] of expectedSurfaces) {
    const html = render(pathname);
    const expectedHeading = english[headingKey];

    if (!html.includes(expectedHeading)) {
      throw new Error(`${pathname} did not render its matching neutral heading: ${expectedHeading}`);
    }
    if (!html.includes(english["shop.previewNotice"])) {
      throw new Error(`${pathname} did not render purchasing-unavailable copy`);
    }

    if (pathname === "/shop") {
      if (!html.includes("<nav")) {
        throw new Error("/shop did not render catalogue navigation");
      }
    } else if (!html.includes('href="/shop"')) {
      throw new Error(`${pathname} did not provide a return link to /shop`);
    }
  }

  const unknownHtml = render("/shop/not-a-real-surface");
  if (!unknownHtml.includes(english["shop.notFound"])) {
    throw new Error("Unknown /shop/* route did not render unavailable state");
  }
  if (unknownHtml.includes("<nav")) {
    throw new Error("Unknown /shop/* route incorrectly rendered catalogue navigation");
  }
} finally {
  rmSync(new URL(testOutDir, root), { recursive: true, force: true });
}

const referenceKeys = Object.keys(locales[0][1]).sort();
for (const [name, values] of locales) {
  const keys = Object.keys(values).sort();
  if (JSON.stringify(keys) !== JSON.stringify(referenceKeys)) {
    throw new Error(`Locale key mismatch: ${name}`);
  }
}

const requiredNeutralKeys = [
  "shop.previewBadge",
  "shop.previewNotice",
  "shop.pendingCommercials",
  "shop.checkoutSafety",
  "shop.surface.product",
  "shop.surface.cart",
  "shop.surface.checkout",
  "shop.surface.order",
  "shop.surface.help",
  "shop.notFound",
];
const forbiddenStaleKeys = [
  "shop.productName",
  "shop.proposition",
  "shop.description",
  "shop.safetyBody",
  "shop.addPreview",
  "shop.suitabilityConfirm",
  "shop.finishPreview",
  "shop.completeBody",
];

for (const [name, values] of locales) {
  for (const key of requiredNeutralKeys) {
    if (!values[key]) throw new Error(`Missing neutral key ${key} in ${name}`);
  }
  for (const key of forbiddenStaleKeys) {
    if (key in values) throw new Error(`Stale commerce key ${key} remains in ${name}`);
  }
}

console.log("Rendered shop route behavior and neutral copy verified for EN, zh-HK and zh-CN.");
