import { Link } from "react-router-dom";
import { t } from "../i18n";
import HealthHeader from "../components/HealthHeader";
import HealthFooter from "../components/HealthFooter";
import "../styles/home.css";

/**
 * Phase-1 products remain COMING_SOON per docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md
 * (no owner-confirmed price/SKU/claims yet), so this route is a real
 * navigation destination — not a dead link — without projecting any
 * commercial field ahead of the product-sync gate.
 */
export default function Products() {
  return (
    <div className="health-site">
      <HealthHeader />
      <main>
        <section className="health-placeholder">
          <p className="health-kicker">{t("health.status.comingSoon")}</p>
          <h1>{t("health.placeholder.products.title")}</h1>
          <p>{t("health.placeholder.products.body")}</p>
          <Link className="health-button secondary" to="/">
            {t("health.placeholder.backHome")}
          </Link>
        </section>
      </main>
      <HealthFooter />
    </div>
  );
}
