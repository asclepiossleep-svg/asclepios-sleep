import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { homeModules } from "../content/publicExperience";
import "../styles/public-home.css";
import "../styles/public-visual-modules.css";

export default function PublicHome() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-hero public-hero-photo">
          <div className="public-hero-copy">
            <p className="public-kicker">SUPPORTING A BRIGHTER YOU</p>
            <h1>Better Sleep.<br />Healthier Living.</h1>
            <p className="public-lede">Science-backed solutions for deeper sleep, sharper days and a healthier, happier you.</p>
            <div className="public-actions">
              <Link className="public-button primary" to="/products">Explore Products <span>→</span></Link>
              <Link className="public-button secondary" to="/member">Enter Sleep App <span>→</span></Link>
            </div>
          </div>
          <div className="public-hero-note">NATURAL<br />SCIENCE<br />BRIGHTER LIVING</div>
          <div className="public-hero-signature">INSPIRED BY NATURE<br />GUIDED BY SCIENCE</div>
        </section>

        <section className="public-pillar-grid" aria-label="Asclepios Health areas">
          {homeModules.map((item) => (
            <Link className="public-pillar-card" to={item.to} key={item.id}>
              <div
                className={`public-pillar-visual ${item.visualClass}`}
                aria-hidden={item.imageAlt ? undefined : true}
                role={item.imageAlt ? "img" : undefined}
                aria-label={item.imageAlt}
                style={item.imageSrc ? { backgroundImage: `url(${item.imageSrc})` } : undefined}
              />
              <div className="public-pillar-copy">
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
                <span>{item.cta} →</span>
              </div>
            </Link>
          ))}
        </section>
      </main>
      <footer className="public-footer public-footer-centered">BETTER PEOPLE · A BRIGHTER TOMORROW</footer>
    </div>
  );
}
