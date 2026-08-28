import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../state/session";
import { t } from "../i18n";
import BottomNav from "../components/BottomNav";

/**
 * Design moodboard 28 Aug 2026 — Home/Welcome dashboard. New default landing
 * page after login (replaces landing straight on Tonight's "start sleep").
 * Setup (Wallpaper + Theme Colour) happens once, via /setup/*; Home is where
 * every return visit lands, with entry points into Tonight, Review, and the
 * setup screens (re-openable any time from here or Settings).
 */
export default function Home() {
  const { user } = useSession();
  const navigate = useNavigate();
  const setupIncomplete = !user?.wallpaperId;

  return (
    <div className="screen">
      <h1>
        {t("home.greeting")}
        {user?.email ? `, ${user.email.split("@")[0]}` : ""}
      </h1>
      <p className="muted">{t("home.subtitle")}</p>

      {setupIncomplete && (
        <div className="card" style={{ borderColor: "var(--color-accent)" }}>
          <p>{t("home.setupIncomplete")}</p>
          <button className="primary" onClick={() => navigate("/setup/wallpaper")}>
            {t("home.setupContinue")}
          </button>
        </div>
      )}

      <Link to="/tonight" className="card" style={{ textDecoration: "none", display: "block", background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}>
        <strong style={{ fontSize: "var(--font-cta)" }}>{t("home.cta.tonight")}</strong>
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Link to="/review" className="card" style={{ textDecoration: "none", color: "var(--color-text)", textAlign: "center" }}>
          {t("home.cta.review")}
        </Link>
        <Link to="/settings" className="card" style={{ textDecoration: "none", color: "var(--color-text)", textAlign: "center" }}>
          {t("home.cta.settings")}
        </Link>
        <Link to="/wallpaper" className="card" style={{ textDecoration: "none", color: "var(--color-text)", textAlign: "center" }}>
          {t("home.cta.wallpaper")}
        </Link>
        <Link to="/theme" className="card" style={{ textDecoration: "none", color: "var(--color-text)", textAlign: "center" }}>
          {t("home.cta.theme")}
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
