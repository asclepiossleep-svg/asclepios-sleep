import type { ReactNode } from "react";
import { t } from "../i18n";
import { SLEEP_APP_URL } from "../config";
import "../styles/home.css";

function SleepLink({ className, children }: { className: string; children: ReactNode }) {
  if (!SLEEP_APP_URL) {
    return (
      <span className={className} title="Sleep app URL pending owner configuration (VITE_SLEEP_APP_URL)">
        {children}
      </span>
    );
  }
  return (
    <a className={className} href={SLEEP_APP_URL} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="health-site">
      <header className="health-header">
        <div className="health-brand">
          <span className="health-brand-name">ASCLEPIOS HEALTH</span>
          <span className="health-brand-sub">{t("health.brand.sub")}</span>
        </div>
      </header>

      <main>
        <section className="health-hero">
          <p className="health-kicker">{t("health.hero.kicker")}</p>
          <h1>{t("health.hero.title")}</h1>
          <p>{t("health.hero.lead")}</p>
          <SleepLink className="health-button">{t("health.hero.cta")}</SleepLink>
        </section>

        <section className="health-section">
          <p className="health-kicker">{t("health.section.kicker")}</p>
          <h2>{t("health.section.title")}</h2>
          <div className="health-card-grid">
            <SleepLink className="health-card">
              <h3>{t("health.card.sleep.title")}</h3>
              <p>{t("health.card.sleep.body")}</p>
              <span className="health-card-cta">{t("health.card.sleep.cta")} →</span>
            </SleepLink>
            <div className="health-card">
              <span className="health-status">{t("health.card.future.status")}</span>
              <h3>{t("health.card.future.title")}</h3>
              <p>{t("health.card.future.body")}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="health-footer">
        <span>
          © {year} Asclepios Health. {t("health.footer.rights")}
        </span>
      </footer>
    </div>
  );
}
