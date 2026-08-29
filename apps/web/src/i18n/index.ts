import en from "./en.json";
import zhHK from "./zh-HK.json";
import zhCN from "./zh-CN.json";

/**
 * Doc 05 §6 — "所有 UI string...都用 locale resource。唔可以將文字散落
 * hard-code 喺 component." Every screen imports t() rather than writing an
 * inline string. Adding zh-TW / more locales later is a new JSON
 * file + one line here — no component changes.
 *
 * Login front-page rebuild (29 Aug 2026) — added zh-CN (Simplified,
 * standard Mandarin phrasing — not a character conversion of the zh-HK
 * Cantonese copy) so the new language selector has all three of Edmund's
 * V1 languages: English / 繁體中文 / 简体中文.
 */
const RESOURCES: Record<string, Record<string, string>> = {
  en,
  "zh-HK": zhHK,
  "zh-CN": zhCN,
};

/** V1 language selector options — order shown in the UI. */
export const SUPPORTED_LOCALES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh-HK", label: "繁體中文" },
  { code: "zh-CN", label: "简体中文" },
];

let currentLocale = "en";

export function setLocale(locale: string) {
  currentLocale = RESOURCES[locale] ? locale : "en";
}

export function getLocale() {
  return currentLocale;
}

export function t(key: string): string {
  return RESOURCES[currentLocale]?.[key] ?? RESOURCES.en[key] ?? key;
}
