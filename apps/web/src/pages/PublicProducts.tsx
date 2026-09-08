import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { getProductModules } from "../content/publicExperience";
import { t } from "../i18n";
import "../styles/public-home.css";
import "../styles/public-visual-modules.css";

export default function PublicProducts() {
  const productModules = getProductModules();

  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-subhero products-subhero">
          <Link className="public-back" to="/">← {t("public.common.back")}</Link>
          <p className="public-kicker">{t("public.products.kicker")}</p>
          <h1>{t("public.products.title")}</h1>
          <p>{t("public.products.intro")}</p>
        </section>
        <section className="public-category-grid">
          {productModules.map((item) => (
            <article className="public-category-card" key={item.id}>
              <div
                className={`public-category-visual ${item.visualClass}`}
                aria-hidden={item.imageAlt ? undefined : true}
                role={item.imageAlt ? "img" : undefined}
                aria-label={item.imageAlt}
                style={item.imageSrc ? { backgroundImage: `url(${item.imageSrc})` } : undefined}
              />
              <div>
                <span className="public-kicker">{item.category}</span>
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
                <Link className="public-card-link" to={`/products/${item.id}`}>{t("public.products.viewDetails")} →</Link>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="public-footer public-footer-centered">{t("public.products.footer")}</footer>
    </div>
  );
}
