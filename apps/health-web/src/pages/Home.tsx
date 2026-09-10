import type { ReactNode } from "react";
import { t } from "../i18n";
import { SLEEP_APP_URL } from "../config";
import "../styles/home.css";

function SleepLink({
  className,
  path = "",
  children,
}: {
  className: string;
  path?: string;
  children: ReactNode;
}) {
  if (!SLEEP_APP_URL) {
    return (
      <span className={className} title="Sleep app URL pending owner configuration (VITE_SLEEP_APP_URL)">
        {children}
      </span>
    );
  }
  return (
    <a className={className} href={`${SLEEP_APP_URL}${path}`} target="_blank" rel="noreferrer">
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
        <nav className="health-nav" aria-label="Primary">
          <a className="health-nav-link" href="#platform">
            {t("health.nav.platform")}
          </a>
          <a className="health-nav-link" href="#solutions">
            {t("health.nav.solutions")}
          </a>
          <a className="health-nav-link" href="#learn">
            {t("health.nav.learn")}
          </a>
          <a className="health-nav-link" href="#member">
            {t("health.nav.member")}
          </a>
          <SleepLink className="health-nav-cta">{t("health.nav.sleep_cta")}</SleepLink>
        </nav>
      </header>

      <main>
        <section className="health-hero" id="top">
          <p className="health-kicker">{t("health.hero.kicker")}</p>
          <h1>{t("health.hero.title")}</h1>
          <p>{t("health.hero.lead")}</p>
          <div className="health-hero-actions">
            <SleepLink className="health-button">{t("health.hero.cta")}</SleepLink>
            <a className="health-button-ghost" href="#platform">
              {t("health.hero.secondary")}
            </a>
          </div>
        </section>

        <section className="health-section" id="platform">
          <p className="health-kicker">{t("health.platform.kicker")}</p>
          <h2>{t("health.platform.title")}</h2>
          <p className="health-section-lead">{t("health.platform.body")}</p>
          <div className="health-pillar-grid">
            <div className="health-pillar">
              <h3>{t("health.platform.pillar1.title")}</h3>
              <p>{t("health.platform.pillar1.body")}</p>
            </div>
            <div className="health-pillar">
              <h3>{t("health.platform.pillar2.title")}</h3>
              <p>{t("health.platform.pillar2.body")}</p>
            </div>
            <div className="health-pillar">
              <h3>{t("health.platform.pillar3.title")}</h3>
              <p>{t("health.platform.pillar3.body")}</p>
            </div>
          </div>
        </section>

        <section className="health-section health-section-alt" id="solutions">
          <p className="health-kicker">{t("health.solutions.kicker")}</p>
          <h2>{t("health.solutions.title")}</h2>
          <div className="health-card-grid">
            <SleepLink className="health-card">
              <h3>{t("health.card.sleep.title")}</h3>
              <p>{t("health.card.sleep.body")}</p>
              <span className="health-card-cta">{t("health.card.sleep.cta")} →</span>
            </SleepLink>
            <div className="health-card">
              <span className="health-status">{t("health.card.recovery.status")}</span>
              <h3>{t("health.card.recovery.title")}</h3>
              <p>{t("health.card.recovery.body")}</p>
            </div>
            <div className="health-card">
              <span className="health-status">{t("health.card.wellness.status")}</span>
              <h3>{t("health.card.wellness.title")}</h3>
              <p>{t("health.card.wellness.body")}</p>
            </div>
          </div>
        </section>

        <section className="health-section" id="learn">
          <p className="health-kicker">{t("health.learn.kicker")}</p>
          <h2>{t("health.learn.title")}</h2>
          <p className="health-section-lead">{t("health.learn.body")}</p>
          <SleepLink className="health-button-outline" path="/learn">
            {t("health.learn.cta")}
          </SleepLink>
        </section>

        <section className="health-section health-section-alt" id="member">
          <p className="health-kicker">{t("health.member.kicker")}</p>
          <h2>{t("health.member.title")}</h2>
          <p className="health-section-lead">{t("health.member.body")}</p>
          <SleepLink className="health-button" path="/member">
            {t("health.member.cta")}
          </SleepLink>
        </section>
      </main>

      <footer className="health-footer">
        <div className="health-footer-top">
          <div className="health-brand">
            <span className="health-brand-name">ASCLEPIOS HEALTH</span>
            <span className="health-footer-tagline">{t("health.footer.tagline")}</span>
          </div>
          <nav className="health-footer-nav" aria-label="Footer">
            <a href="#top">{t("health.nav.home")}</a>
            <a href="#platform">{t("health.nav.platform")}</a>
            <a href="#solutions">{t("health.nav.solutions")}</a>
            <a href="#learn">{t("health.nav.learn")}</a>
            <a href="#member">{t("health.nav.member")}</a>
          </nav>
        </div>
        <span className="health-footer-rights">
          © {year} Asclepios Health. {t("health.footer.rights")}
        </span>
      </footer>
    </div>
  );
}
