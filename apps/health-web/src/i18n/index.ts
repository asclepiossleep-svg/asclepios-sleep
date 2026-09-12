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

export const SUPPORTED_LOCALES = Object.keys(RESOURCES);

const STORAGE_KEY = "health.locale";
const listeners = new Set<() => void>();

function readStoredLocale(): string {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && stored in RESOURCES ? stored : "en";
}

let currentLocale = readStoredLocale();

export function getLocale() {
  return currentLocale;
}

/**
 * `t()` is a plain module-level read, not a hook, so switching locale
 * doesn't by itself re-render components. Callers that need to react to
 * a change should subscribe via useLocale() (see useLocale.ts), which
 * this notifies.
 */
export function setLocale(locale: string) {
  if (!(locale in RESOURCES) || locale === currentLocale) return;
  currentLocale = locale;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: string): string {
  return RESOURCES[currentLocale]?.[key] ?? RESOURCES.en[key] ?? key;
}
