import { Link, NavLink } from "react-router-dom";
import { setLocale, SUPPORTED_LOCALES, t, useLocale } from "../i18n";
import PublicBrand from "./PublicBrand";

export default function PublicHeader() {
  const locale = useLocale();

  return (
    <header className="public-header">
      <PublicBrand />
      <nav className="public-nav" aria-label={t("public.nav.aria")}>
        <NavLink to="/products">{t("public.nav.products")}</NavLink>
        <Link to="/member">{t("public.nav.sleepApp")}</Link>
        <NavLink to="/education">{t("public.nav.education")}</NavLink>
      </nav>
      <label className="public-language" aria-label={t("public.language.label")}>
        <span aria-hidden="true">🌐</span>
        <select value={locale} onChange={(event) => setLocale(event.target.value)}>
          {SUPPORTED_LOCALES.map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
      </label>
    </header>
  );
}
