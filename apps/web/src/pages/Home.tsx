import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../state/session";
import { t } from "../i18n";
import { api } from "../api/client";
import { usePwaInstall } from "../state/usePwaInstall";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

interface TodayNudge {
  code: "MISSING_CHECKIN" | "FOCUS_TAG" | "ON_TRACK";
  tag?: string;
}

const NUDGE_DISMISS_KEY_PREFIX = "asclepios.nudgeDismissed.";
// PWA install/Home Screen flow (6 Sep 2026) — a one-time nudge, not a daily
// one like the check-in nudge above: once dismissed (or once installed) it
// should stay gone rather than resurface every day, per "avoid repeated
// nagging." Settings > Install App remains the permanent, non-nagging way
// back to install/guidance for anyone who dismissed this without acting.
const INSTALL_DISMISS_KEY = "asclepios.installPromptDismissed";

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
  const { isStandalone, canPromptInstall, showIosGuidance, promptInstall } = usePwaInstall();
  const [installDismissed, setInstallDismissed] = useState(true);

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

  useEffect(() => {
    try {
      setInstallDismissed(localStorage.getItem(INSTALL_DISMISS_KEY) === "1");
    } catch {
      setInstallDismissed(false);
    }
  }, []);

  function dismissNudge() {
    setNudge(null);
    try {
      localStorage.setItem(todayKey(), "1");
    } catch {
      /* best-effort only */
    }
  }

  function dismissInstallPrompt() {
    setInstallDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    } catch {
      /* best-effort only */
    }
  }

  // Nothing to offer on a browser that neither fired beforeinstallprompt
  // (Android/Chrome) nor is iOS Safari (Share -> Add to Home Screen) — most
  // desktop browsers land here, and showing a dead "Install" control with no
  // real action behind it is exactly the kind of defect this audit track
  // exists to remove.
  const showInstallPrompt = !installDismissed && !isStandalone && (canPromptInstall || showIosGuidance);

  return (
    <div className="screen">
      <PageHeader
        title={
          <>
            {t("home.greeting")}
            {/* 31 Aug 2026 — Edmund's feedback: don't invent a "name" out of
                the email address. Prefer the name they actually gave us
                (Register, or added later in Settings); only fall back to
                the email prefix for accounts that never set one. */}
            {user?.displayName ? `, ${user.displayName}` : user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </>
        }
        subtitle={t("home.subtitle")}
      />

      {nudge && nudge.code !== "ON_TRACK" && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <p style={{ margin: 0 }}>{nudge.code === "FOCUS_TAG" ? `${t("home.nudge.focusTag")} ${t(`tag.${nudge.tag}`)}` : t(`home.nudge.${nudge.code}`)}</p>
          <button onClick={dismissNudge}>{t("home.nudge.dismiss")}</button>
        </div>
      )}

      {showInstallPrompt && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div>
            <p style={{ margin: 0 }}>{t("home.installPrompt.body")}</p>
            {showIosGuidance && !canPromptInstall && (
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                {t("home.installPrompt.iosSteps")}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            {canPromptInstall && (
              <button className="primary" onClick={() => promptInstall().then(dismissInstallPrompt)}>
                {t("home.installPrompt.install")}
              </button>
            )}
            <button onClick={dismissInstallPrompt}>{t("home.nudge.dismiss")}</button>
          </div>
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
        <Link to="/programmes" className="card" style={{ textDecoration: "none", color: "var(--color-text)", textAlign: "center" }}>
          {t("home.cta.programmes")}
        </Link>
        <Link to="/music" className="card" style={{ textDecoration: "none", color: "var(--color-text)", textAlign: "center" }}>
          {t("home.cta.music")}
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
