import { Link } from "react-router-dom";
import "../styles/public-home.css";

const products = [
  {
    name: "SLEEPTAPE™ Nasal Strips",
    timing: "Night support",
    description: "Phase 1 Asclepios Sleep product. Final commercial details are being prepared.",
  },
  {
    name: "DAY MODE™",
    timing: "Day support",
    description: "Phase 1 daytime product line. Final commercial details are being prepared.",
  },
  {
    name: "REST & SLEEP MODE™",
    timing: "Night support",
    description: "Phase 1 night-time product line. Final commercial details are being prepared.",
  },
];

export default function Products() {
  return (
    <div className="public-site">
      <header className="public-header">
        <Link className="public-brand" to="/">ASCLĒPIOS HEALTH</Link>
        <nav className="public-nav" aria-label="Primary navigation">
          <Link to="/products">Shop</Link>
          <Link to="/#how-it-works">How It Works</Link>
          <Link to="/#intelligence">Sleep Intelligence</Link>
          <Link to="/#learn">Learn</Link>
          <Link to="/login">Account</Link>
        </nav>
      </header>

      <main>
        <section className="public-section" id="shop">
          <div className="public-section-heading">
            <p className="public-kicker">PHASE 1</p>
            <h2>Sleep support, connected.</h2>
            <p>These catalogue entries are staged for launch. Purchasing stays disabled until pricing, tax, inventory and fulfilment are confirmed.</p>
          </div>
          <div className="public-product-grid">
            {products.map((product) => (
              <article className="public-product-card" key={product.name}>
                <span className="public-status">COMING SOON</span>
                <p className="public-product-timing">{product.timing}</p>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <button disabled type="button">Purchase not yet enabled</button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <span>ASCLĒPIOS HEALTH</span>
        <span>Staging storefront · commercial launch controls remain locked</span>
      </footer>
    </div>
  );
}
