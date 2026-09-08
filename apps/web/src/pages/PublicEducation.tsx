import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import "../styles/public-home.css";

const learning = [
  { title: "Sleep Foundations", copy: "Understand how sleep works and the practical foundations of better rest." },
  { title: "Calm Mind Practices", copy: "Practical, evidence-led ways to reduce mental load and prepare for sleep." },
  { title: "Science & Research", copy: "Research notes, evidence summaries and expert-reviewed guidance for the platform." },
];

export default function PublicEducation() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-subhero education-subhero">
          <Link className="public-back" to="/">← Back</Link>
          <p className="public-kicker">KNOWLEDGE FOR A BRIGHTER TOMORROW</p>
          <h1>Learning & Courses for Better Sleep and Healthier Living.</h1>
          <p>Education lives on its own public surface, with deeper courses and research separated from the member app.</p>
        </section>
        <section className="public-category-grid" id="research">
          {learning.map((item) => (
            <article className="public-category-card" key={item.title}>
              <div className="public-category-visual learning" aria-hidden="true" />
              <div>
                <span className="public-kicker">LEARNING</span>
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
                <span className="public-card-link">Open section →</span>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="public-footer public-footer-centered">BETTER PEOPLE · A BRIGHTER TOMORROW</footer>
    </div>
  );
}
