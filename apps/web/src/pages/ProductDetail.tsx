import { Link, Navigate, useParams } from "react-router-dom";
import { t } from "../i18n";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import BotanicalAccent from "../components/BotanicalAccent";
import { PUBLIC_PRODUCTS } from "../data/publicProducts";
import "../styles/public-design-system.css";
import "../styles/public-product-detail.css";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = PUBLIC_PRODUCTS.find((p) => p.slug === slug);

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <div className="public-detail-back">
          <Link to="/products">← {t("public.productDetail.back")}</Link>
        </div>

        <div className="public-detail-hero">
          <span className="public-status">{t("public.status.comingSoon")}</span>
          <h1>{t(product.nameKey)}</h1>
          <p className="public-lede">{t(product.descriptionKey)}</p>
        </div>

        <div className="public-detail-body">
          <div className="public-card public-detail-usage">
            <BotanicalAccent className="corner-bottom-left" />
            <h2>{t("public.productDetail.howUsed")}</h2>
            <ul>
              {product.usageKeys.map((key) => (
                <li key={key}>
                  <span className="public-entry-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M3.5 10.5 8 15l8.5-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="public-card public-detail-side">
            <h2>{t("public.productDetail.whatExpect.title")}</h2>
            <p>{t("public.productDetail.whatExpect.body")}</p>
            <p className="muted">{t("public.productDetail.statusNote")}</p>
            <button type="button" disabled className="public-button secondary" style={{ marginTop: 8 }}>
              {t("public.products.buyDisabled")}
            </button>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
