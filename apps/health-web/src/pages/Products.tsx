import { Link } from "react-router-dom";
import { t } from "../i18n";
import HealthHeader from "../components/HealthHeader";
import HealthFooter from "../components/HealthFooter";
import "../styles/home.css";

/**
 * Phase-1 products remain COMING_SOON per docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md
 * (no owner-confirmed price/SKU/claims yet), so this route is a real
 * navigation destination — not a dead link — without projecting any
 * commercial field ahead of the product-sync gate. Family names and forms
 * below are the canonical Phase-1 identity from that governance doc; no
 * packaging imagery is shown until owner-approved catalog artwork is
 * available to crop from directly.
 */
const PHASE_1_FAMILIES = [
  { name: "health.products.family.sleeptape", form: "health.products.family.sleeptapeForm" },
  { name: "health.products.family.dayMode", form: "health.products.family.dayModeForm" },
  { name: "health.products.family.restSleepMode", form: "health.products.family.restSleepModeForm" },
] as const;

export default function Products() {
  return (
    <div className="health-site">
      <HealthHeader />
      <main>
        <section className="health-placeholder">
          <p className="health-kicker">{t("health.status.comingSoon")}</p>
          <h1>{t("health.placeholder.products.title")}</h1>
          <p>{t("health.placeholder.products.body")}</p>

          <ul className="health-product-family-grid">
            {PHASE_1_FAMILIES.map((family) => (
              <li key={family.name} className="health-product-family-card">
                <span className="health-status">{t("health.status.comingSoon")}</span>
                <h3>{t(family.name)}</h3>
                <p>{t(family.form)}</p>
              </li>
            ))}
          </ul>
          <p className="health-product-imagery-note">{t("health.products.imageryNote")}</p>

          <Link className="health-button secondary" to="/">
            {t("health.placeholder.backHome")}
          </Link>
        </section>
      </main>
      <HealthFooter />
    </div>
  );
}
