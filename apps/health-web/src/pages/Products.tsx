import { useMemo, useState } from "react";
import { t } from "../i18n";
import HealthHeader from "../components/HealthHeader";
import HealthFooter from "../components/HealthFooter";
import { HEALTH_PRODUCTS, HealthProductCategory } from "../data/products";
import "../styles/home.css";
import "../styles/products.css";

type ChipFilter = "all" | HealthProductCategory;

const CHIP_VALUES: ChipFilter[] = ["all", "night", "day"];

export default function Products() {
  const [filter, setFilter] = useState<ChipFilter>("all");

  const visibleProducts = useMemo(
    () => HEALTH_PRODUCTS.filter((product) => filter === "all" || product.category === filter),
    [filter]
  );

  return (
    <div className="health-site">
      <HealthHeader />
      <main>
        <section className="health-products-intro">
          <p className="health-kicker">{t("health.products.kicker")}</p>
          <h1>{t("health.products.title")}</h1>
          <p className="health-products-lead">{t("health.products.lead")}</p>
          <div className="health-chip-row" role="group" aria-label={t("health.products.filterLabel")}>
            {CHIP_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                className={`health-chip ${filter === value ? "is-active" : ""}`.trim()}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {t(`health.products.chip.${value}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="health-products-grid">
          {visibleProducts.map((product) => (
            <article className="health-product-card" key={product.slug}>
              <span className="health-status">{t("health.status.comingSoon")}</span>
              <p className="health-product-timing">{t(product.timingKey)}</p>
              <h2>{t(product.nameKey)}</h2>
              <p>{t(product.descriptionKey)}</p>
            </article>
          ))}
        </section>

        <p className="health-product-imagery-note health-products-footnote">
          {t("health.products.imageryNote")}
        </p>
      </main>
      <HealthFooter />
    </div>
  );
}
