import { Link } from "react-router-dom";
import { t } from "../i18n";
import HealthHeader from "../components/HealthHeader";
import HealthFooter from "../components/HealthFooter";
import BotanicalAccent from "../components/BotanicalAccent";
import SleepAppLink from "../components/SleepAppLink";
import heroPhoto from "../assets/hero/health-hero-sunrise.webp";
import "../styles/home.css";

export default function Home() {
  return (
    <div className="health-site">
      <HealthHeader />

      <main>
        <section className="health-hero">
          <img className="health-hero-photo" src={heroPhoto} alt="" aria-hidden="true" />
          <div className="health-hero-scrim" aria-hidden="true" />
          <BotanicalAccent className="hero" />
          <div className="health-hero-content">
            <p className="health-kicker">{t("health.hero.eyebrow")}</p>
            <h1>
              <span>{t("health.hero.title.line1")}</span>
              <span>{t("health.hero.title.line2")}</span>
            </h1>
            <p className="health-hero-lead">{t("health.hero.lead")}</p>
            <div className="health-hero-actions">
              <Link className="health-button primary" to="/products">
                {t("health.hero.cta.products")}
              </Link>
              <SleepAppLink className="health-button secondary">{t("health.hero.cta.sleepApp")}</SleepAppLink>
            </div>
          </div>
        </section>

        <section className="health-section" id="start">
          <p className="health-kicker health-section-kicker">{t("health.entries.kicker")}</p>
          <div className="health-destination-list">
            <Link className="health-destination-card" to="/products">
              <span className="health-destination-media products" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M11.2 3H5.6A2.6 2.6 0 0 0 3 5.6v5.6c0 .69.27 1.35.76 1.84l8.6 8.6a2.6 2.6 0 0 0 3.68 0l5.2-5.2a2.6 2.6 0 0 0 0-3.68l-8.6-8.6A2.6 2.6 0 0 0 11.2 3Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                </svg>
              </span>
              <span className="health-destination-body">
                <span className="health-status">{t("health.status.comingSoon")}</span>
                <h3>{t("health.card.products.title")}</h3>
                <p>{t("health.card.products.body")}</p>
                <ul className="health-product-family-list">
                  <li>{t("health.products.family.sleeptape")}</li>
                  <li>{t("health.products.family.dayMode")}</li>
                  <li>{t("health.products.family.restSleepMode")}</li>
                </ul>
                <span className="health-card-cta">{t("health.card.products.cta")} →</span>
              </span>
            </Link>

            <SleepAppLink className="health-destination-card">
              <span className="health-destination-media sleep-app" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <rect x="7" y="3" width="10" height="18" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10.5 18h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 7.2a3.6 3.6 0 1 0 3.2 5.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <span className="health-destination-body">
                <span className="health-status">{t("health.status.available")}</span>
                <h3>{t("health.card.sleepApp.title")}</h3>
                <p>{t("health.card.sleepApp.body")}</p>
                <span className="health-card-cta">{t("health.card.sleepApp.cta")} →</span>
              </span>
            </SleepAppLink>

            <Link className="health-destination-card" to="/learn">
              <span className="health-destination-media learning" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path d="M4 5.5c2.5-1 5-1 7 0v13c-2-1-4.5-1-7 0v-13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M20 5.5c-2.5-1-5-1-7 0v13c2-1 4.5-1 7 0v-13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="health-destination-body">
                <span className="health-status">{t("health.status.comingSoon")}</span>
                <h3>{t("health.card.learning.title")}</h3>
                <p>{t("health.card.learning.body")}</p>
                <span className="health-card-cta">{t("health.card.learning.cta")} →</span>
              </span>
            </Link>
          </div>
        </section>

        <section className="health-section alt" id="platform">
          <p className="health-kicker">{t("health.about.kicker")}</p>
          <h2>{t("health.about.title")}</h2>
          <p className="health-about-lead">{t("health.about.body")}</p>
        </section>
      </main>

      <HealthFooter />
    </div>
  );
}
