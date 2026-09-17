import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../state/session";
import { t } from "../i18n";
import { api } from "../api/client";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

interface TodayNudge {
  code: "MISSING_CHECKIN" | "FOCUS_TAG" | "ON_TRACK";
  tag?: string;
}

const NUDGE_DISMISS_KEY_PREFIX = "asclepios.nudgeDismissed.";

function todayKey(): string {
  return NUDGE_DISMISS_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

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
      /* localStorage unavailable — just show the nudge every visit */
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

  const linkStyle = {
    textDecoration: "none",
    color: "var(--color-text)",
    minHeight: "4rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  } as const;

  return (
    <div className="screen">
      <PageHeader
        title={
          <>
            {t("home.greeting")}
            {user?.displayName ? `, ${user.displayName}` : user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </>
        }
        subtitle={t("home.subtitle")}
      />

      <section style={{ display: "grid", gap: "0.9rem" }}>
        <Link
          to="/tonight"
          className="card"
          style={{
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "1.25rem",
            minHeight: "10rem",
            padding: "1.4rem",
            background: "var(--color-primary)",
            color: "var(--color-primary-contrast)",
          }}
        >
          <span style={{ opacity: 0.78, fontSize: "var(--font-small)" }}>{t("home.subtitle")}</span>
          <strong style={{ fontSize: "clamp(1.45rem, 6vw, 2rem)", lineHeight: 1.15 }}>{t("home.cta.tonight")}</strong>
          <span aria-hidden="true" style={{ alignSelf: "flex-end", fontSize: "1.5rem" }}>→</span>
        </Link>

        {nudge && nudge.code !== "ON_TRACK" && (
          <div
            className="card"
            role="status"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.9rem", padding: "1rem 1.1rem" }}
          >
            <p style={{ margin: 0, lineHeight: 1.45 }}>
              {nudge.code === "FOCUS_TAG" ? `${t("home.nudge.focusTag")} ${t(`tag.${nudge.tag}`)}` : t(`home.nudge.${nudge.code}`)}
            </p>
            <button onClick={dismissNudge} style={{ flexShrink: 0 }}>{t("home.nudge.dismiss")}</button>
          </div>
        )}

        {setupIncomplete && (
          <div className="card" style={{ borderColor: "var(--color-accent)", padding: "1.1rem" }}>
            <p style={{ marginTop: 0 }}>{t("home.setupIncomplete")}</p>
            <button className="primary" onClick={() => navigate("/setup/wallpaper")} style={{ minHeight: "3rem", width: "100%" }}>
              {t("home.setupContinue")}
            </button>
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: "0.65rem", marginTop: "1.1rem" }}>
        <Link to="/review" className="card" style={linkStyle}>
          <strong>{t("home.cta.review")}</strong>
          <span aria-hidden="true">→</span>
        </Link>
        <Link to="/programmes" className="card" style={linkStyle}>
          <strong>{t("home.cta.programmes")}</strong>
          <span aria-hidden="true">→</span>
        </Link>
        <Link to="/learn" className="card" style={linkStyle}>
          <strong>{t("home.cta.learn")}</strong>
          <span aria-hidden="true">→</span>
        </Link>
        <Link to="/music" className="card" style={linkStyle}>
          <strong>{t("home.cta.music")}</strong>
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginTop: "0.65rem" }}>
        <Link to="/wallpaper" className="card" style={{ ...linkStyle, justifyContent: "center", textAlign: "center" }}>
          {t("home.cta.wallpaper")}
        </Link>
        <Link to="/theme" className="card" style={{ ...linkStyle, justifyContent: "center", textAlign: "center" }}>
          {t("home.cta.theme")}
        </Link>
      </section>

      <Link
        to="/settings"
        style={{ display: "block", textAlign: "center", margin: "1rem 0 0", padding: "0.8rem", color: "var(--color-text-muted, var(--color-text))" }}
      >
        {t("home.cta.settings")}
      </Link>

      <BottomNav />
    </div>
  );
}
