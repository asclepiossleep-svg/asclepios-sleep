import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { t } from "../i18n";

/**
 * Neutral launch shell.
 *
 * Product identity and mutable commercial facts intentionally stay out of this
 * component until the canonical product source of truth is reconciled and the
 * existing Product API can supply approved data.
 */
export default function Shop() {
  return (
    <main className="screen">
      <PageHeader title={t("shop.title")} subtitle={t("shop.subtitle")} />

      <section
        className="card"
        aria-labelledby="shop-coming-soon-title"
        style={{ borderColor: "var(--color-accent)" }}
      >
        <p className="muted" style={{ marginTop: 0 }}>
          {t("shop.productCategory")}
        </p>
        <h2
          id="shop-coming-soon-title"
          tabIndex={-1}
          style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}
        >
          {t("shop.previewBadge")}
        </h2>
        <p>{t("shop.previewNotice")}</p>
        <p className="muted" style={{ marginBottom: 0 }}>
          {t("shop.pendingCommercials")}
        </p>
      </section>

      <p className="muted" role="status">
        {t("shop.checkoutSafety")}
      </p>

      <Link
        to="/home"
        style={{
          color: "var(--color-text)",
          minHeight: "var(--touch-target-min)",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {t("shop.home")}
      </Link>
    </main>
  );
}
