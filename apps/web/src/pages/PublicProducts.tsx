import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { productModules } from "../content/publicExperience";
import "../styles/public-home.css";

export default function PublicProducts() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-subhero products-subhero">
          <Link className="public-back" to="/">← Back</Link>
          <p className="public-kicker">NATURE · SCIENCE · A BRIGHTER YOU</p>
          <h1>Products for Better Sleep & Daily Wellbeing.</h1>
          <p>Each product tile is an independent visual module. Approved packaging, photography, background treatment and campaign art can change product by product without rebuilding the page structure.</p>
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
      <footer className="public-footer public-footer-centered">INSPIRED BY NATURE · GUIDED BY SCIENCE</footer>
    </div>
  );
}
