import { Link } from "react-router-dom";
import { t } from "../i18n";
import HealthHeader from "../components/HealthHeader";
import HealthFooter from "../components/HealthFooter";
import { HEALTH_PRODUCTS } from "../data/products";
import { CART_MAX_LINE_QUANTITY, useCart } from "../state/cart";
import "../styles/home.css";
import "../styles/commerce.css";

export default function Cart() {
  const { lines, totalQuantity, setQuantity, removeItem, clear } = useCart();

  return (
    <div className="health-site">
      <HealthHeader />
      <main>
        <section className="health-cart">
          <p className="health-kicker">{t("health.status.comingSoon")}</p>
          <h1>{t("health.cart.title")}</h1>
          <p className="health-cart-disclaimer">{t("health.cart.disclaimer")}</p>

          {lines.length === 0 ? (
            <div className="health-cart-empty">
              <p className="health-cart-empty-title">{t("health.cart.emptyTitle")}</p>
              <p>{t("health.cart.emptyBody")}</p>
              <Link className="health-button primary" to="/products">
                {t("health.cart.browseProducts")}
              </Link>
            </div>
          ) : (
            <>
              <ul className="health-cart-list">
                {lines.map((line) => {
                  const product = HEALTH_PRODUCTS.find((item) => item.slug === line.slug);
                  if (!product) return null;
                  return (
                    <li className="health-cart-row" key={line.slug}>
                      <div className="health-cart-row-info">
                        <h2>{t(product.nameKey)}</h2>
                        <p className="health-price-notice">{t("health.cart.priceNotice")}</p>
                      </div>
                      <div className="health-stepper" role="group" aria-label={t(product.nameKey)}>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.slug, line.quantity - 1)}
                          aria-label={t("health.product.detail.decreaseQuantity")}
                          disabled={line.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="health-stepper-value">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.slug, line.quantity + 1)}
                          aria-label={t("health.product.detail.increaseQuantity")}
                          disabled={line.quantity >= CART_MAX_LINE_QUANTITY}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="health-cart-remove"
                        onClick={() => removeItem(line.slug)}
                      >
                        {t("health.cart.remove")}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="health-cart-summary">
                <p className="health-cart-count">
                  {t("health.cart.itemCountLabel")}: {totalQuantity}
                </p>
                <p className="health-price-notice">{t("health.cart.priceNotice")}</p>
                <div className="health-cart-summary-actions">
                  <button type="button" className="health-button secondary" onClick={clear}>
                    {t("health.cart.clear")}
                  </button>
                  <button
                    type="button"
                    className="health-button primary"
                    aria-disabled="true"
                    title={t("health.cart.checkoutPending")}
                    onClick={(event) => event.preventDefault()}
                  >
                    {t("health.cart.checkout")}
                  </button>
                </div>
                <p className="health-cart-checkout-note">{t("health.cart.checkoutPending")}</p>
              </div>
            </>
          )}
        </section>
      </main>
      <HealthFooter />
    </div>
  );
}
