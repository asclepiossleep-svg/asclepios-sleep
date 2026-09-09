import { Link, useLocation } from "react-router-dom";
import { t, getLocale } from "../i18n";
import brandMark from "../assets/brand/asclepios-mark.webp";

/**
 * Shared header for the Asclepios Health public marketing pages (issue
 * #45): white sticky bar, brand mark + wordmark, real nav routes (not
 * anchor placeholders), teal "Get Started" CTA.
 */
export default function PublicHeader() {
  const location = useLocation();
  const showChineseBrandName = getLocale().startsWith("zh");

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

  return (
    <header className="public-header">
      <Link className="public-brand" to="/">
        <img src={brandMark} alt="" className="public-brand-mark" aria-hidden="true" />
        <span className="public-brand-lockup">
          <span className="public-brand-name">
            ASCLĒPIOS
            {showChineseBrandName && <span> 阿斯康</span>}
          </span>
          <span className="public-brand-sub">{t("public.brand.sub")}</span>
        </span>
      </Link>
      <nav className="public-nav" aria-label="Primary navigation">
        <Link to="/products" className={isActive("/products") ? "is-active" : undefined}>
          {t("public.nav.products")}
        </Link>
        <Link to="/sleep-app" className={isActive("/sleep-app") ? "is-active" : undefined}>
          {t("public.nav.sleepApp")}
        </Link>
        <Link to="/learn">{t("public.nav.learn")}</Link>
        <Link to="/login" className="public-button primary">
          {t("public.nav.account")}
        </Link>
      </nav>
    </header>
  );
}
