import { Link, Navigate, useParams } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { getProductModules } from "../content/publicExperience";
import { t } from "../i18n";
import "../styles/public-home.css";
import "../styles/public-visual-modules.css";

export default function PublicProductDetail() {
  const { productId } = useParams();
  const product = getProductModules().find((item) => item.id === productId);

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-subhero products-subhero">
          <Link className="public-back" to="/products">← {t("public.productDetail.backProducts")}</Link>
          <p className="public-kicker">{product.category}</p>
          <h1>{product.title}</h1>
          <p>{product.copy}</p>
        </section>
        <section className="public-category-grid">
          <article className="public-category-card">
            <div
              className={`public-category-visual ${product.visualClass}`}
              aria-hidden="true"
            />
            <div>
              <span className="public-kicker">{t("public.products.kicker")}</span>
              <h2>{t("public.productDetail.pendingTitle")}</h2>
              <p>{t("public.productDetail.pending")}</p>
              <Link className="public-card-link" to="/">{t("public.productDetail.home")} →</Link>
            </div>
          </article>
        </section>
      </main>
      <footer className="public-footer public-footer-centered">{t("public.products.footer")}</footer>
    </div>
  );
}
