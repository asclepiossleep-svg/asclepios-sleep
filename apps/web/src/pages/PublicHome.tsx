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

export default function PublicHome() {
  return (
    <div className="public-site">
      <header className="public-header">
        <Link className="public-brand" to="/">ASCLĒPIOS HEALTH</Link>
        <nav className="public-nav" aria-label="Primary navigation">
          <Link to="/products">Shop</Link>
          <a href="#how-it-works">How It Works</a>
          <a href="#intelligence">Sleep Intelligence</a>
          <a href="#learn">Learn</a>
          <Link to="/login">Account</Link>
        </nav>
      </header>

      <main>
        <section className="public-hero">
          <p className="public-kicker">PRODUCTS · EDUCATION · PERSONAL GUIDANCE</p>
          <h1>A clearer path to better sleep.</h1>
          <p className="public-lede">
            Asclepios combines everyday sleep support products with a simple digital routine that helps you focus on what matters tonight.
          </p>
          <div className="public-actions">
            <Link className="public-button primary" to="/products">Explore Sleep Solutions</Link>
            <Link className="public-button secondary" to="/login">Open Member Experience</Link>
          </div>
        </section>

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

        <section className="public-section public-flow" id="how-it-works">
          <div>
            <p className="public-kicker">ONE CONTINUOUS LOOP</p>
            <h2>From product to tonight’s plan.</h2>
          </div>
          <ol>
            <li><strong>Understand</strong><span>Start with a short assessment and your current routine.</span></li>
            <li><strong>Focus</strong><span>Receive only 1–3 useful actions for the day or night.</span></li>
            <li><strong>Learn</strong><span>Check in, review what changed, and adjust the next plan.</span></li>
          </ol>
        </section>

        <section className="public-section public-intelligence" id="intelligence">
          <p className="public-kicker">SLEEP INTELLIGENCE</p>
          <h2>Complexity belongs to the system, not the user.</h2>
          <div className="public-domain-grid">
            <div><strong>RHYTHM</strong><span>作息節律</span></div>
            <div><strong>CALM</strong><span>身心平靜</span></div>
            <div><strong>BODY</strong><span>身心狀態</span></div>
            <div><strong>SUPPORT</strong><span>支持環境</span></div>
          </div>
        </section>

        <section className="public-section" id="learn">
          <p className="public-kicker">LEARN</p>
          <h2>Useful guidance, without turning sleep into homework.</h2>
          <p className="public-lede compact">Education, products and the member experience are designed to work as one system rather than separate content libraries.</p>
        </section>
      </main>

      <footer className="public-footer">
        <span>ASCLĒPIOS HEALTH</span>
        <span>Staging storefront · commercial launch controls remain locked</span>
      </footer>
    </div>
  );
}
