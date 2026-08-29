import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../state/session";
import { t } from "../i18n";
import { api } from "../api/client";
import BottomNav from "../components/BottomNav";

interface TodayNudge {
  code: "MISSING_CHECKIN" | "FOCUS_TAG" | "ON_TRACK";
  tag?: string;
}

const NUDGE_DISMISS_KEY_PREFIX = "asclepios.nudgeDismissed.";

function todayKey(): string {
  return NUDGE_DISMISS_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

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
  const [nudge, setNudge] = useState<TodayNudge | null>(null);

  useEffect(() => {
    let dismissedToday = false;
    try {
      dismissedToday = localStorage.getItem(todayKey()) === "1";
    } catch {
      /* localStorage unavailable — just show the nudge every visit, harmless */
    }
    if (dismissedToday) return;
    api.get<TodayNudge>("/today/nudge").then(setNudge).catch(() => {});
  }, []);

  function dismissNudge() {
    setNudge(null);
    try {
      localStorage.setItem(todayKey(), "1");
    } catch {
      /* best-effort only */
    }
  }

  return (
    <div className="screen">
      <h1>
        {t("home.greeting")}
        {user?.email ? `, ${user.email.split("@")[0]}` : ""}
      </h1>
      <p className="muted">{t("home.subtitle")}</p>

      {nudge && nudge.code !== "ON_TRACK" && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <p style={{ margin: 0 }}>{nudge.code === "FOCUS_TAG" ? `${t("home.nudge.focusTag")} ${t(`tag.${nudge.tag}`)}` : t(`home.nudge.${nudge.code}`)}</p>
          <button onClick={dismissNudge}>{t("home.nudge.dismiss")}</button>
        </div>
      )}

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
        <Link to="/learn" className="card" style={{ textDecoration: "none", color: "var(--color-text)", textAlign: "center" }}>
          {t("home.cta.learn")}
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
