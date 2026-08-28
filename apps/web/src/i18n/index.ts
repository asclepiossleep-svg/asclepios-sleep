import en from "./en.json";
import zhHK from "./zh-HK.json";

/**
 * Doc 05 §6 — "所有 UI string...都用 locale resource。唔可以將文字散落
 * hard-code 喺 component." Every screen imports t() rather than writing an
 * inline string. Adding zh-TW / zh-CN / more locales later is a new JSON
 * file + one line here — no component changes.
 */
const RESOURCES: Record<string, Record<string, string>> = {
  en,
  "zh-HK": zhHK,
};

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
