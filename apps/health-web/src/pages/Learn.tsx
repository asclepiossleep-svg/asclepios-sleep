import { Link } from "react-router-dom";
import { t } from "../i18n";
import HealthHeader from "../components/HealthHeader";
import HealthFooter from "../components/HealthFooter";
import "../styles/home.css";

export default function Learn() {
  return (
    <div className="health-site">
      <HealthHeader />
      <main>
        <section className="health-placeholder">
          <p className="health-kicker">{t("health.status.comingSoon")}</p>
          <h1>{t("health.placeholder.learn.title")}</h1>
          <p>{t("health.placeholder.learn.body")}</p>
          <Link className="health-button secondary" to="/">
            {t("health.placeholder.backHome")}
          </Link>
        </section>
      </main>
      <HealthFooter />
    </div>
  );
}
