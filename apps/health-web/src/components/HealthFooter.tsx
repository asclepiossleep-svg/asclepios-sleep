import { Link } from "react-router-dom";
import { t } from "../i18n";
import BotanicalAccent from "./BotanicalAccent";

export default function HealthFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="health-footer">
      <BotanicalAccent className="footer" />
      <p className="health-footer-line">{t("health.footer.brandLine")}</p>
      <div className="health-footer-meta">
        <Link to="/">{t("health.footer.home")}</Link>
        <span>
          © {year} Asclepios Health. {t("health.footer.rights")}
        </span>
      </div>
    </footer>
  );
}
