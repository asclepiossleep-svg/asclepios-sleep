import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { getHomeModules } from "../content/publicExperience";
import { t } from "../i18n";
import "../styles/public-home.css";
import "../styles/public-visual-modules.css";

export default function PublicHome() {
  const homeModules = getHomeModules();

  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-hero public-hero-photo">
          <div className="public-hero-copy">
            <p className="public-kicker">{t("public.home.kicker")}</p>
            <h1>{t("public.home.title.line1")}<br />{t("public.home.title.line2")}</h1>
            <p className="public-lede">{t("public.home.lede")}</p>
            <div className="public-actions">
              <Link className="public-button primary" to="/products">{t("public.home.products.cta")} <span>→</span></Link>
              <Link className="public-button secondary" to="/member">{t("public.home.app.cta")} <span>→</span></Link>
            </div>
          </div>
          <div className="public-hero-note">{t("public.home.note")}</div>
          <div className="public-hero-signature">{t("public.home.signature")}</div>
        </section>

        <section className="public-pillar-grid" aria-label={t("public.home.areasAria")}>
          {homeModules.map((item) => (
            <Link className="public-pillar-card" to={item.to} key={item.id}>
              <div
                className={`public-pillar-visual ${item.visualClass}`}
                aria-hidden={item.imageAlt ? undefined : true}
                role={item.imageAlt ? "img" : undefined}
                aria-label={item.imageAlt}
                style={item.imageSrc ? { backgroundImage: `url(${item.imageSrc})` } : undefined}
              />
              <div className="public-pillar-copy">
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
                <span>{item.cta} →</span>
              </div>
            </Link>
          ))}
        </section>
      </main>
      <footer className="public-footer public-footer-centered">{t("public.home.footer")}</footer>
    </div>
  );
}
