import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import heroPhoto from "../assets/hero/login-hero-photo.webp";
import "../styles/public-design-system.css";
import "../styles/public-home.css";

export default function PublicHome() {
  return (
    <div className="health-proof-page">
      <PublicHeader />
      <main>
        <section className="health-proof-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.92) 0%, rgba(255,255,255,.72) 44%, rgba(255,255,255,.08) 72%), url(${heroPhoto})` }}>
          <div className="health-proof-copy">
            <p className="health-proof-kicker">SUPPORTING A BRIGHTER YOU</p>
            <h1>Better Sleep.<br />Healthier Living.</h1>
            <p className="health-proof-lead">Science-backed solutions for deeper sleep, sharper days and a healthier, happier you.</p>
            <div className="health-proof-actions">
              <Link className="health-proof-btn primary" to="/products">Explore Products <span>→</span></Link>
              <Link className="health-proof-btn secondary" to="/sleep-app">Enter Sleep App <span>→</span></Link>
            </div>
            <div className="health-proof-nature"><span>⌁</span><small>INSPIRED BY NATURE<br />GUIDED BY SCIENCE</small></div>
          </div>
        </section>

        <section className="health-proof-cards" aria-label="Asclepios Health main areas">
          <Link className="health-proof-card" to="/products">
            <div className="health-proof-card-image product" aria-hidden="true">✦</div>
            <div className="health-proof-card-copy">
              <h2>Products</h2>
              <p>Thoughtfully formulated support for sleep, calm and everyday wellbeing.</p>
              <span>EXPLORE PRODUCTS →</span>
            </div>
          </Link>

          <Link className="health-proof-card" to="/sleep-app">
            <div className="health-proof-card-image sleep" style={{ backgroundImage: `linear-gradient(rgba(8,48,57,.18),rgba(8,48,57,.32)),url(${heroPhoto})` }} aria-hidden="true"><b>ASCLEPIOS<br/>SLEEP</b></div>
            <div className="health-proof-card-copy">
              <h2>Sleep App</h2>
              <p>Personalised guidance for better sleep and brighter days.</p>
              <span>ENTER SLEEP APP →</span>
            </div>
          </Link>

          <Link className="health-proof-card" to="/learn">
            <div className="health-proof-card-image learning" aria-hidden="true"><div>Sleep Better</div><div>Live Healthier</div><div>A Brighter You</div></div>
            <div className="health-proof-card-copy">
              <h2>Learning &amp; Courses</h2>
              <p>Evidence-based education for a healthier, more fulfilling life.</p>
              <span>START LEARNING →</span>
            </div>
          </Link>
        </section>

        <footer className="health-proof-footer">BETTER PEOPLE<br/>A BRIGHTER TOMORROW</footer>
      </main>
    </div>
  );
}
