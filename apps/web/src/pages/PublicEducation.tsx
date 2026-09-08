import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import "../styles/public-home.css";

const learning = [
  { title: "Sleep Foundations", copy: "Understand how sleep works and the practical foundations of better rest." },
  { title: "Calm Mind Practices", copy: "General learning material about calm evening routines." },
  { title: "Science & Research", copy: "A future home for sourced research notes and reading lists." },
];

export default function PublicEducation() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-subhero education-subhero">
          <Link className="public-back" to="/">← Back</Link>
          <p className="public-kicker">KNOWLEDGE FOR A BRIGHTER TOMORROW</p>
          <h1>Sleep and wellbeing learning resources.</h1>
          <p>This preview keeps public learning resources separate from the member app. Course sections are not yet available.</p>
        </section>
        <section className="public-category-grid" id="research">
          {learning.map((item) => (
            <article className="public-category-card" key={item.title}>
              <div className="public-category-visual learning" aria-hidden="true" />
              <div>
                <span className="public-kicker">LEARNING</span>
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
                <span className="public-card-link">Section coming soon</span>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="public-footer public-footer-centered">ASCLEPIOS HEALTH · LEARNING PREVIEW</footer>
    </div>
  );
}
