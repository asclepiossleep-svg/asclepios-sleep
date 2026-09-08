import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { productModules } from "../content/publicExperience";
import "../styles/public-home.css";
import "../styles/public-visual-modules.css";

export default function PublicProducts() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-subhero products-subhero">
          <Link className="public-back" to="/">← Back</Link>
          <p className="public-kicker">NATURE · SCIENCE · A BRIGHTER YOU</p>
          <h1>Product information coming soon.</h1>
          <p>This is a non-purchasable preview. Catalogue, prices, availability, cart and checkout are not connected.</p>
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
                <button type="button" disabled>Catalogue details pending</button>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="public-footer public-footer-centered">ASCLEPIOS HEALTH · PRODUCT PREVIEW</footer>
    </div>
  );
}
