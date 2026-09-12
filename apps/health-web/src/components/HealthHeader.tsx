import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { t, setLocale, SUPPORTED_LOCALES } from "../i18n";
import { useLocale } from "../i18n/useLocale";
import brandMark from "../assets/brand/asclepios-mark.webp";
import SleepAppLink from "./SleepAppLink";

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  "zh-HK": "繁體中文",
  "zh-CN": "简体中文",
};

export default function HealthHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const activeLocale = useLocale();

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

  return (
    <header className="health-header">
      <Link className="health-brand" to="/" onClick={() => setMenuOpen(false)}>
        <img src={brandMark} alt="" className="health-brand-mark" aria-hidden="true" />
        <span className="health-brand-lockup">
          <span className="health-brand-name">ASCLEPIOS HEALTH</span>
          <span className="health-brand-sub">{t("health.brand.sub")}</span>
        </span>
      </Link>

      <nav className="health-nav-desktop" aria-label="Primary navigation">
        <Link to="/products" className={isActive("/products") ? "is-active" : undefined}>
          {t("health.nav.products")}
        </Link>
        <SleepAppLink className="health-nav-link">{t("health.nav.sleepApp")}</SleepAppLink>
        <Link to="/learn" className={isActive("/learn") ? "is-active" : undefined}>
          {t("health.nav.learn")}
        </Link>
      </nav>

      <div className="health-header-actions">
        <select
          className="health-lang-select"
          aria-label={t("health.language.label")}
          value={activeLocale}
          onChange={(event) => setLocale(event.target.value)}
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {LOCALE_NAMES[locale] ?? locale}
            </option>
          ))}
        </select>
        <button type="button" className="health-icon-button" title={t("health.action.searchPending")} aria-disabled="true">
          <span className="sr-only">{t("health.action.search")}</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.6" cy="8.6" r="5.6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16.5 16.5 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className="health-icon-button" title={t("health.action.bagPending")} aria-disabled="true">
          <span className="sr-only">{t("health.action.bag")}</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5.5 7.5h9l.7 9.2a1.3 1.3 0 0 1-1.3 1.4H6.1a1.3 1.3 0 0 1-1.3-1.4l.7-9.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M7.5 7.5V6a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className="health-icon-button health-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="health-mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{t(menuOpen ? "health.action.closeMenu" : "health.action.menu")}</span>
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4.5 4.5 15.5 15.5M15.5 4.5 4.5 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3.5 6h13M3.5 10h13M3.5 14h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <nav id="health-mobile-nav" className="health-nav-mobile" aria-label="Mobile navigation">
          <Link to="/products" onClick={() => setMenuOpen(false)}>
            {t("health.nav.products")}
          </Link>
          <SleepAppLink className="health-nav-mobile-link">{t("health.nav.sleepApp")}</SleepAppLink>
          <Link to="/learn" onClick={() => setMenuOpen(false)}>
            {t("health.nav.learn")}
          </Link>
          <SleepAppLink className="health-nav-mobile-link">{t("health.nav.account")}</SleepAppLink>
        </nav>
      )}
    </header>
  );
}
