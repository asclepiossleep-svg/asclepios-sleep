import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import "../styles/public-home.css";

const pillars = [
  { title: "Products", copy: "Thoughtfully selected sleep and wellbeing products.", to: "/products", cta: "Explore products" },
  { title: "Sleep App", copy: "Personalised guidance for better sleep and brighter days.", to: "/member", cta: "Enter Sleep App" },
  { title: "Learning & Courses", copy: "Evidence-based education for healthier, more confident choices.", to: "/education", cta: "Start learning" },
];

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
          {pillars.map((item, index) => (
            <Link className={`public-pillar-card pillar-${index + 1}`} to={item.to} key={item.title}>
              <div className="public-pillar-visual" aria-hidden="true" />
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
