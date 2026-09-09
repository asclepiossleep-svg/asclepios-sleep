import { Link } from "react-router-dom";
import { t } from "../i18n";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import BotanicalAccent from "../components/BotanicalAccent";
import heroPhoto from "../assets/hero/login-hero-photo.webp";
import "../styles/public-design-system.css";
import "../styles/public-sleep-app.css";

const FEATURES = [
  { titleKey: "public.sleepApp.feature.tonight.title", bodyKey: "public.sleepApp.feature.tonight.body" },
  { titleKey: "public.sleepApp.feature.programme.title", bodyKey: "public.sleepApp.feature.programme.body" },
  { titleKey: "public.sleepApp.feature.intelligence.title", bodyKey: "public.sleepApp.feature.intelligence.body" },
  { titleKey: "public.sleepApp.feature.history.title", bodyKey: "public.sleepApp.feature.history.body" },
];

export default function SleepApp() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-sleepapp-hero">
          <div>
            <p className="public-kicker">{t("public.sleepApp.kicker")}</p>
            <h1>{t("public.sleepApp.title")}</h1>
            <p className="public-lede">{t("public.sleepApp.lead")}</p>
            <div className="public-actions">
              <Link className="public-button primary" to="/login">
                {t("public.sleepApp.cta.open")}
              </Link>
              <Link className="public-button secondary" to="/products">
                {t("public.sleepApp.cta.products")}
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

        <section className="public-section alt">
          <div className="public-sleepapp-features">
            {FEATURES.map((feature) => (
              <div className="public-card public-sleepapp-feature-card" key={feature.titleKey}>
                <BotanicalAccent className="corner-top-right" />
                <h3>{t(feature.titleKey)}</h3>
                <p>{t(feature.bodyKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="public-sleepapp-banner">
          <div>
            <h2>{t("public.sleepApp.banner.title")}</h2>
            <p>{t("public.sleepApp.banner.body")}</p>
          </div>
          <Link className="public-button primary" to="/login">
            {t("public.sleepApp.banner.cta")}
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
