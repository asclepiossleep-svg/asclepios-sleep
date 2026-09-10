import en from "./en.json";
import zhHK from "./zh-HK.json";
import zhCN from "./zh-CN.json";

/**
 * AGENTS.md §3 — every UI string goes through t(); no hard-coded
 * user-facing text in components. Mirrors apps/web/src/i18n/index.ts's
 * resource shape so the two apps stay pattern-compatible without sharing
 * a runtime dependency.
 */
const RESOURCES: Record<string, Record<string, string>> = {
  en,
  "zh-HK": zhHK,
  "zh-CN": zhCN,
};

let currentLocale = "en";

export function getLocale() {
  return currentLocale;
}

export function t(key: string): string {
  return RESOURCES[currentLocale]?.[key] ?? RESOURCES.en[key] ?? key;
}
