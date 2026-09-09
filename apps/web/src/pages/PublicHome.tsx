import { Link } from "react-router-dom";
import { t } from "../i18n";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import BotanicalAccent from "../components/BotanicalAccent";
import { PUBLIC_PRODUCTS } from "../data/publicProducts";
import heroPhoto from "../assets/hero/login-hero-photo.webp";
import "../styles/public-design-system.css";
import "../styles/public-home.css";

export default function PublicHome() {
  return (
    <div className="public-site">
      <PublicHeader />

      <main>
        <section className="public-hero">
          <div className="public-hero-content">
            <p className="public-kicker">{t("public.home.kicker")}</p>
            <h1>{t("public.home.title")}</h1>
            <p className="public-lede">{t("public.home.lead")}</p>
            <div className="public-actions">
              <Link className="public-button primary" to="/products">
                {t("public.home.cta.products")}
              </Link>
              <Link className="public-button secondary" to="/sleep-app">
                {t("public.home.cta.sleepApp")}
              </Link>
            </div>
          </div>
          <div className="public-hero-photo-wrap">
            <div className="public-photo-frame">
              <img src={heroPhoto} alt="" />
            </div>
            <BotanicalAccent className="hero" />
          </div>
        </section>

        <section className="public-section" id="start">
          <div className="public-section-heading">
            <p className="public-kicker">{t("public.home.entries.kicker")}</p>
            <h2>{t("public.home.entries.title")}</h2>
          </div>
          <div className="public-entry-grid">
            <Link className="public-card public-entry-card" to="/products">
              <BotanicalAccent className="corner-top-right" />
              <span className="public-entry-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                  <path d="M4 15.5V6.8c0-.8.5-1.4 1.3-1.6L10 4l4.7 1.2c.8.2 1.3.8 1.3 1.6v8.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 15.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <h3>{t("public.home.entry.products.title")}</h3>
              <p>{t("public.home.entry.products.body")}</p>
              <span className="public-entry-cta">{t("public.home.entry.products.cta")} →</span>
            </Link>
            <Link className="public-card public-entry-card" to="/sleep-app">
              <BotanicalAccent className="corner-top-right" />
              <span className="public-entry-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10 6v4l2.6 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <h3>{t("public.home.entry.sleepApp.title")}</h3>
              <p>{t("public.home.entry.sleepApp.body")}</p>
              <span className="public-entry-cta">{t("public.home.entry.sleepApp.cta")} →</span>
            </Link>
            <Link className="public-card public-entry-card" to="/learn">
              <BotanicalAccent className="corner-top-right" />
              <span className="public-entry-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                  <path d="M3.5 14.5 8 9.8l3 3 5.5-6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13 6.5h3.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3>{t("public.home.entry.learning.title")}</h3>
              <p>{t("public.home.entry.learning.body")}</p>
              <span className="public-entry-cta">{t("public.home.entry.learning.cta")} →</span>
            </Link>
          </div>
        </section>

        <section className="public-section alt" id="shop">
          <div className="public-section-heading">
            <p className="public-kicker">{t("public.home.phase1.kicker")}</p>
            <h2>{t("public.home.phase1.title")}</h2>
            <p>{t("public.home.phase1.lead")}</p>
          </div>
          <div className="public-product-mini-grid">
            {PUBLIC_PRODUCTS.map((product) => (
              <Link className="public-card public-product-mini-card" to={`/products/${product.slug}`} key={product.slug}>
                <span className="public-status">{t("public.status.comingSoon")}</span>
                <p className="public-product-mini-timing">{t(product.timingKey)}</p>
                <h3>{t(product.nameKey)}</h3>
                <p>{t(product.descriptionKey)}</p>
              </Link>
            ))}
          </div>
          <div className="public-actions" style={{ marginTop: 32 }}>
            <Link className="public-button secondary" to="/products">
              {t("public.home.phase1.cta")}
            </Link>
          </div>
        </section>

        <section className="public-section public-flow" id="how-it-works">
          <div>
            <p className="public-kicker">{t("public.home.flow.kicker")}</p>
            <h2>{t("public.home.flow.title")}</h2>
          </div>
          <ol>
            <li>
              <strong>{t("public.home.flow.step1.title")}</strong>
              <span>{t("public.home.flow.step1.body")}</span>
            </li>
            <li>
              <strong>{t("public.home.flow.step2.title")}</strong>
              <span>{t("public.home.flow.step2.body")}</span>
            </li>
            <li>
              <strong>{t("public.home.flow.step3.title")}</strong>
              <span>{t("public.home.flow.step3.body")}</span>
            </li>
          </ol>
        </section>

        <section className="public-section public-intelligence" id="intelligence">
          <p className="public-kicker">{t("public.home.intelligence.kicker")}</p>
          <h2>{t("public.home.intelligence.title")}</h2>
          <div className="public-domain-grid">
            <div><strong>RHYTHM</strong><span>作息節律</span></div>
            <div><strong>CALM</strong><span>身心平靜</span></div>
            <div><strong>BODY</strong><span>身心狀態</span></div>
            <div><strong>SUPPORT</strong><span>支持環境</span></div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
