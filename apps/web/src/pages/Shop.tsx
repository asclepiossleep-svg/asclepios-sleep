import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { t } from "../i18n";

type Surface = "catalogue" | "product" | "cart" | "checkout" | "order" | "help" | "unknown";

const surfaceByPath: Record<string, Exclude<Surface, "unknown">> = {
  "/shop": "catalogue",
  "/shop/product": "product",
  "/shop/cart": "cart",
  "/shop/checkout": "checkout",
  "/shop/order": "order",
  "/shop/help": "help",
};

const navItems: Array<{ surface: Exclude<Surface, "catalogue" | "unknown">; path: string }> = [
  { surface: "product", path: "/shop/product" },
  { surface: "cart", path: "/shop/cart" },
  { surface: "checkout", path: "/shop/checkout" },
  { surface: "order", path: "/shop/order" },
  { surface: "help", path: "/shop/help" },
];

const titleKeyBySurface: Record<Exclude<Surface, "unknown">, string> = {
  catalogue: "shop.previewBadge",
  product: "shop.surface.product",
  cart: "shop.surface.cart",
  checkout: "shop.surface.checkout",
  order: "shop.surface.order",
  help: "shop.surface.help",
};

/**
 * Addressable non-production commerce shell.
 *
 * Product identity and mutable commercial facts intentionally stay out of this
 * component until the canonical source of truth is reconciled and the existing
 * Product API can supply approved data.
 */
export default function Shop() {
  const { pathname } = useLocation();
  const surface: Surface = surfaceByPath[pathname] ?? "unknown";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [pathname]);

  const linkStyle = {
    color: "var(--color-text)",
    minHeight: "var(--touch-target-min)",
    display: "inline-flex",
    alignItems: "center",
  } as const;

  const headingKey = surface === "unknown" ? "shop.notFound" : titleKeyBySurface[surface];

  return (
    <main className="screen">
      <PageHeader title={t("shop.title")} subtitle={t("shop.subtitle")} />

      <section
        className="card"
        aria-labelledby="shop-surface-title"
        style={{ borderColor: "var(--color-accent)" }}
      >
        <p className="muted" style={{ marginTop: 0 }}>
          {t("shop.productCategory")}
        </p>
        <h2
          ref={headingRef}
          id="shop-surface-title"
          tabIndex={-1}
          style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}
        >
          {t(headingKey)}
        </h2>
        <p>{surface === "unknown" ? t("shop.notFound") : t("shop.previewNotice")}</p>
        {surface !== "unknown" && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {t("shop.pendingCommercials")}
          </p>
        )}
      </section>

      {surface === "catalogue" ? (
        <nav className="card" aria-label={t("shop.title")}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
            {navItems.map((item) => (
              <li key={item.surface}>
                <Link to={item.path} style={linkStyle}>
                  {t(`shop.surface.${item.surface}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <Link to="/shop" style={linkStyle}>
          {t("shop.back")}
        </Link>
      )}

      {surface !== "unknown" && (
        <p className="muted" role="status">
          {t("shop.checkoutSafety")}
        </p>
      )}

      <Link to="/home" style={linkStyle}>
        {t("shop.home")}
      </Link>
    </main>
  );
}
