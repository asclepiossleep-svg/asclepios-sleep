import { t } from "../i18n";
import HealthHeader from "../components/HealthHeader";
import HealthFooter from "../components/HealthFooter";
import SleepAppLink from "../components/SleepAppLink";
import { Link } from "react-router-dom";
import "../styles/home.css";
import "../styles/products.css";
import "../styles/sleep.css";

const FEATURES = [
  { titleKey: "health.sleep.feature.tonight.title", bodyKey: "health.sleep.feature.tonight.body" },
  { titleKey: "health.sleep.feature.programme.title", bodyKey: "health.sleep.feature.programme.body" },
  { titleKey: "health.sleep.feature.intelligence.title", bodyKey: "health.sleep.feature.intelligence.body" },
  { titleKey: "health.sleep.feature.history.title", bodyKey: "health.sleep.feature.history.body" },
];

export default function Sleep() {
  return (
    <div className="health-site">
      <HealthHeader />
      <main>
        <section className="health-products-intro health-sleep-intro">
          <p className="health-kicker">{t("health.sleep.kicker")}</p>
          <h1>{t("health.sleep.title")}</h1>
          <p className="health-products-lead">{t("health.sleep.lead")}</p>
          <div className="health-hero-actions health-sleep-actions">
            <SleepAppLink className="health-button primary">{t("health.sleep.cta.startTonight")}</SleepAppLink>
            <Link className="health-button secondary" to="/products">
              {t("health.hero.cta.products")}
            </Link>
          </div>
        </section>

        <section className="health-section alt health-sleep-focus">
          <p className="health-kicker health-section-kicker">{t("health.sleep.focus.kicker")}</p>
          <h2>{t("health.sleep.focus.title")}</h2>
          <p className="health-about-lead">{t("health.card.sleepApp.body")}</p>
        </section>

        <section className="health-sleep-features">
          {FEATURES.map((feature) => (
            <article className="health-product-card health-sleep-feature-card" key={feature.titleKey}>
              <h2>{t(feature.titleKey)}</h2>
              <p>{t(feature.bodyKey)}</p>
            </article>
          ))}
        </section>

        <section className="health-sleep-banner">
          <div>
            <h2>{t("health.sleep.banner.title")}</h2>
            <p>{t("health.sleep.banner.body")}</p>
          </div>
          <SleepAppLink className="health-button primary">{t("health.sleep.banner.cta")}</SleepAppLink>
        </section>
      </main>
      <HealthFooter />
    </div>
  );
}
