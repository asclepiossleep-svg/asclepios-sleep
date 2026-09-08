import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import "../styles/public-home.css";

const categories = [
  { title: "Sleep Support", copy: "Sleep-focused products and routines, presented with clear usage guidance." },
  { title: "Calm & Body", copy: "Wellbeing support for relaxation, body comfort and daily balance." },
  { title: "Gut & Mood", copy: "Gut and mood support products connected to the wider wellbeing journey." },
];

export default function PublicProducts() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-subhero products-subhero">
          <Link className="public-back" to="/">← Back</Link>
          <p className="public-kicker">NATURE · SCIENCE · A BRIGHTER YOU</p>
          <h1>Products for Better Sleep & Daily Wellbeing.</h1>
          <p>Product pages stay separate from the homepage. Confirmed catalogue facts, images and commercial details will populate here without inventing unapproved claims, prices or stock.</p>
        </section>
        <section className="public-category-grid">
          {categories.map((item) => (
            <article className="public-category-card" key={item.title}>
              <div className="public-category-visual" aria-hidden="true" />
              <div>
                <span className="public-kicker">PRODUCT RANGE</span>
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
