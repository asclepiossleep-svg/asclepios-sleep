import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { t } from "../i18n";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import { PUBLIC_PRODUCTS, PublicProductCategory } from "../data/publicProducts";
import "../styles/public-design-system.css";
import "../styles/public-products.css";

type ChipFilter = "all" | PublicProductCategory;

export default function Products() {
  const [filter, setFilter] = useState<ChipFilter>("all");

  const visibleProducts = useMemo(
    () => PUBLIC_PRODUCTS.filter((product) => filter === "all" || product.category === filter),
    [filter]
  );

  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-products-intro">
          <p className="public-kicker">{t("public.products.kicker")}</p>
          <h1>{t("public.products.title")}</h1>
          <p className="public-lede">{t("public.products.lead")}</p>
          <div className="public-chip-row" role="group" aria-label="Filter products by category">
            <button
              type="button"
              className={`public-chip ${filter === "all" ? "is-active" : ""}`.trim()}
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
            >
              {t("public.products.chip.all")}
            </button>
            <button
              type="button"
              className={`public-chip ${filter === "night" ? "is-active" : ""}`.trim()}
              onClick={() => setFilter("night")}
              aria-pressed={filter === "night"}
            >
              {t("public.products.chip.night")}
            </button>
            <button
              type="button"
              className={`public-chip ${filter === "day" ? "is-active" : ""}`.trim()}
              onClick={() => setFilter("day")}
              aria-pressed={filter === "day"}
            >
              {t("public.products.chip.day")}
            </button>
          </div>
        </section>

        <section className="public-products-grid">
          {visibleProducts.map((product) => (
            <Link className="public-card public-products-card" to={`/products/${product.slug}`} key={product.slug}>
              <span className="public-status">{t("public.status.comingSoon")}</span>
              <p className="public-product-mini-timing">{t(product.timingKey)}</p>
              <h2>{t(product.nameKey)}</h2>
              <p>{t(product.descriptionKey)}</p>
              <div className="public-products-card-footer">
                <span className="public-entry-cta">{t("public.products.cta.viewDetails")} →</span>
              </div>
            </Link>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
