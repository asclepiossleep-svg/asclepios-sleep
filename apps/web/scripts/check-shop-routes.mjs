import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const shop = readFileSync(new URL("src/pages/Shop.tsx", root), "utf8");
const localePaths = [
  ["en", new URL("src/i18n/en.json", root)],
  ["zh-HK", new URL("src/i18n/zh-HK.json", root)],
  ["zh-CN", new URL("src/i18n/zh-CN.json", root)],
];

const expectedRoutes = [
  "/shop",
  "/shop/product",
  "/shop/cart",
  "/shop/checkout",
  "/shop/order",
  "/shop/help",
];

for (const route of expectedRoutes) {
  if (!shop.includes(`"${route}"`)) {
    throw new Error(`Missing addressable commerce route: ${route}`);
  }
}

if (!shop.includes('surfaceByPath[pathname] ?? "unknown"')) {
  throw new Error("Unknown /shop/* routes must resolve to an explicit unknown state");
}
if (!shop.includes('t("shop.notFound")')) {
  throw new Error("Unknown shop route must render translated not-found copy");
}

const locales = localePaths.map(([name, url]) => [
  name,
  JSON.parse(readFileSync(url, "utf8")),
]);
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

console.log("Shop route and neutral-copy contract verified for EN, zh-HK and zh-CN.");
