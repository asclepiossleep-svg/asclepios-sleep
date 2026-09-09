import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import { t } from "../i18n";
import "../styles/public-home.css";

export default function PublicEducation() {
  const learning = [
    { title: t("public.education.sleep.title"), copy: t("public.education.sleep.copy") },
    { title: t("public.education.calm.title"), copy: t("public.education.calm.copy") },
    { title: t("public.education.research.title"), copy: t("public.education.research.copy") },
  ];

  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-subhero education-subhero">
          <Link className="public-back" to="/">← {t("public.common.back")}</Link>
          <p className="public-kicker">{t("public.education.kicker")}</p>
          <h1>{t("public.education.title")}</h1>
          <p>{t("public.education.intro")}</p>
        </section>
        <section className="public-category-grid">
          {learning.map((item) => (
            <article className="public-category-card" key={item.title}>
              <div className="public-category-visual learning" aria-hidden="true" />
              <div>
                <span className="public-kicker">{t("public.education.label")}</span>
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
                <span className="public-card-link">{t("public.education.comingSoon")}</span>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="public-footer public-footer-centered">{t("public.education.footer")}</footer>
    </div>
  );
}
