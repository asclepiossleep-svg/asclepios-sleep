import { Link } from "react-router-dom";
import brandMark from "../assets/brand/asclepios-mark.webp";
import "../styles/public-front-door.css";

/**
 * Public company entry point for the broader Asclepios Health platform.
 *
 * Important launch-safety rule: this page intentionally contains no prices,
 * product claims, stock statements, shipping promises, or purchase controls.
 * Those belong to the commerce chain only after their canonical provider data
 * is wired and verified. Until then the public front door gives visitors one
 * real, non-dead next step: member access to Asclepios Sleep.
 */
export default function PublicFrontDoor() {
  return (
    <main className="public-front-door">
      <header className="public-front-door__header">
        <div className="public-front-door__brand" aria-label="Asclepios Health">
          <img src={brandMark} alt="" aria-hidden="true" />
          <div>
            <strong>ASCLEPIOS</strong>
            <span>HEALTH</span>
          </div>
        </div>
        <Link className="public-front-door__member-link" to="/login">
          Member access
        </Link>
      </header>

      <section className="public-front-door__hero" aria-labelledby="public-front-door-title">
        <p className="public-front-door__eyebrow">ASCLEPIOS HEALTH</p>
        <h1 id="public-front-door-title">A calm front door to your Asclepios services.</h1>
        <p>
          Asclepios Sleep is the first member experience available through the
          Asclepios Health platform. Additional public product and education
          journeys will only appear here when their source data and launch gates
          are verified.
        </p>
        <div className="public-front-door__actions">
          <Link className="public-front-door__primary" to="/login">
            Open Asclepios Sleep
          </Link>
          <span className="public-front-door__status">Public shop: preparing safely</span>
        </div>
      </section>

      <section className="public-front-door__grid" aria-label="Platform status">
        <article>
          <span className="public-front-door__kicker">MEMBER SERVICE</span>
          <h2>Asclepios Sleep</h2>
          <p>Member login and the existing Sleep experience remain available through one clear entry point.</p>
          <Link to="/login">Continue to member access →</Link>
        </article>
        <article>
          <span className="public-front-door__kicker">PRODUCTS</span>
          <h2>Catalogue</h2>
          <p>Product pages stay unpublished until approved product, price, tax, stock and fulfilment data are operationally wired.</p>
          <span className="public-front-door__status">Not yet public</span>
        </article>
        <article>
          <span className="public-front-door__kicker">PLATFORM</span>
          <h2>Built to expand</h2>
          <p>The public entry is separated from the member app so future Asclepios services can be added without changing the Sleep journey.</p>
          <span className="public-front-door__status">Foundation</span>
        </article>
      </section>
    </main>
  );
}
