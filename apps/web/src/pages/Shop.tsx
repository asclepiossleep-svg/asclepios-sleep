import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { t } from "../i18n";

type PreviewStep = "product" | "cart" | "checkout" | "complete";

export default function Shop() {
  const [step, setStep] = useState<PreviewStep>("product");

  return (
    <main className="screen">
      <PageHeader title={t("shop.title")} subtitle={t("shop.subtitle")} />

      <div className="card" style={{ borderColor: "var(--color-accent)" }}>
        <strong>{t("shop.previewBadge")}</strong>
        <p className="muted" style={{ marginBottom: 0 }}>{t("shop.previewNotice")}</p>
      </div>

      {step === "product" && (
        <>
          <article className="card">
            <p className="muted" style={{ marginTop: 0 }}>{t("shop.productCategory")}</p>
            <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>
              {t("shop.productName")}
            </h2>
            <p style={{ fontSize: "1.15rem" }}>{t("shop.proposition")}</p>
            <p>{t("shop.description")}</p>
            <ul>
              <li><strong>{t("shop.valueSimple")}</strong> — {t("shop.valueSimpleBody")}</li>
              <li><strong>{t("shop.valueConnected")}</strong> — {t("shop.valueConnectedBody")}</li>
              <li><strong>{t("shop.valueResponsible")}</strong> — {t("shop.valueResponsibleBody")}</li>
            </ul>
          </article>

          <aside className="card" aria-label={t("shop.safetyTitle")}>
            <strong>{t("shop.safetyTitle")}</strong>
            <p style={{ marginBottom: 0 }}>{t("shop.safetyBody")}</p>
          </aside>

          <button className="primary" onClick={() => setStep("cart")}>
            {t("shop.addPreview")}
          </button>
        </>
      )}

      {step === "cart" && (
        <section className="card">
          <h2>{t("shop.cartTitle")}</h2>
          <p><strong>{t("shop.productName")}</strong></p>
          <p className="muted">{t("shop.pendingCommercials")}</p>
          <button className="primary" onClick={() => setStep("checkout")}>
            {t("shop.continuePreview")}
          </button>
          <button onClick={() => setStep("product")} style={{ marginLeft: "0.5rem" }}>
            {t("shop.back")}
          </button>
        </section>
      )}

      {step === "checkout" && (
        <section className="card">
          <h2>{t("shop.checkoutTitle")}</h2>
          <p>{t("shop.checkoutSafety")}</p>
          <label style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <input type="checkbox" required style={{ width: 24, height: 24, marginTop: 4 }} />
            <span>{t("shop.suitabilityConfirm")}</span>
          </label>
          <button className="primary" onClick={() => setStep("complete")} style={{ marginTop: "1rem" }}>
            {t("shop.finishPreview")}
          </button>
          <button onClick={() => setStep("cart")} style={{ marginLeft: "0.5rem" }}>
            {t("shop.back")}
          </button>
        </section>
      )}

      {step === "complete" && (
        <section className="card" role="status">
          <h2>{t("shop.completeTitle")}</h2>
          <p>{t("shop.completeBody")}</p>
          <button onClick={() => setStep("product")}>{t("shop.restart")}</button>
        </section>
      )}

      <Link to="/home" style={{ color: "var(--color-text)", minHeight: "var(--touch-target-min)", display: "inline-flex", alignItems: "center" }}>
        {t("shop.home")}
      </Link>
    </main>
  );
}
