import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { t } from "../i18n";
import HealthHeader from "../components/HealthHeader";
import HealthFooter from "../components/HealthFooter";
import { HEALTH_PRODUCTS } from "../data/products";
import { CART_MAX_LINE_QUANTITY, useCart } from "../state/cart";
import "../styles/home.css";
import "../styles/products.css";
import "../styles/commerce.css";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = HEALTH_PRODUCTS.find((item) => item.slug === slug);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  if (!product) {
    return (
      <div className="health-site">
        <HealthHeader />
        <main>
          <section className="health-placeholder">
            <p className="health-kicker">{t("health.status.comingSoon")}</p>
            <h1>{t("health.product.detail.notFoundTitle")}</h1>
            <p>{t("health.product.detail.notFoundBody")}</p>
            <Link className="health-button secondary" to="/products">
              {t("health.product.detail.back")}
            </Link>
          </section>
        </main>
        <HealthFooter />
      </div>
    );
  }

  function handleAdd() {
    addItem(product!.slug, quantity);
    setJustAdded(true);
  }

  return (
    <div className="health-site">
      <HealthHeader />
      <main>
        <section className="health-detail">
          <Link className="health-detail-back" to="/products">
            ← {t("health.product.detail.back")}
          </Link>
          <span className="health-status">{t("health.status.comingSoon")}</span>
          <p className="health-product-timing">{t(product.timingKey)}</p>
          <h1>{t(product.nameKey)}</h1>
          <p className="health-detail-description">{t(product.descriptionKey)}</p>
          <p className="health-price-notice">{t("health.product.detail.priceNotice")}</p>

          <div className="health-quantity-row">
            <span className="health-quantity-label" id="detail-quantity-label">
              {t("health.product.detail.quantityLabel")}
            </span>
            <div className="health-stepper" role="group" aria-labelledby="detail-quantity-label">
              <button
                type="button"
                onClick={() => {
                  setQuantity((value) => Math.max(1, value - 1));
                  setJustAdded(false);
                }}
                aria-label={t("health.product.detail.decreaseQuantity")}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span className="health-stepper-value">{quantity}</span>
              <button
                type="button"
                onClick={() => {
                  setQuantity((value) => Math.min(CART_MAX_LINE_QUANTITY, value + 1));
                  setJustAdded(false);
                }}
                aria-label={t("health.product.detail.increaseQuantity")}
                disabled={quantity >= CART_MAX_LINE_QUANTITY}
              >
                +
              </button>
            </div>
          </div>

          <div className="health-detail-actions">
            <button type="button" className="health-button primary" onClick={handleAdd}>
              {t("health.product.detail.addToCart")}
            </button>
            <Link className="health-button secondary" to="/cart">
              {t("health.product.detail.viewCart")}
            </Link>
          </div>

          {justAdded && (
            <p className="health-detail-confirmation" role="status">
              {t("health.product.detail.addedConfirmation")}
            </p>
          )}

          <p className="health-product-imagery-note">{t("health.products.imageryNote")}</p>
        </section>
      </main>
      <HealthFooter />
    </div>
  );
}
