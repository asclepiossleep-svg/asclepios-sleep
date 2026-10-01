import { useNavigate } from "react-router-dom";
import { t } from "../i18n";

/**
 * Go Back / Previous Page audit (6 Sep 2026) — several drill-in screens
 * (Wallpaper/Theme Colour from Settings, Morning Check-in, Assessment) had
 * no bottom nav and no in-page exit, so a saved-state-losing browser back
 * gesture was the only way out. Same stroke idiom as BottomNav's icons
 * (20x20 viewBox, currentColor, 1.4 stroke width, round caps/joins) so it
 * reads as the same icon system, not a one-off.
 *
 * Defaults to `navigate(-1)` (real browser history back, so any state the
 * previous screen held is exactly as it was); pass `to` only when a screen
 * can be reached without history (e.g. a deep link) and needs a fixed
 * fallback destination instead.
 */
export default function BackButton({ to, inverse = false }: { to?: string; inverse?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      aria-label={t("nav.back")}
      className="back-button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "var(--touch-target-min)",
        minHeight: "var(--touch-target-min)",
        gap: "0.35rem",
        background: inverse ? "rgba(255,255,255,0.16)" : "transparent",
        border: "none",
        borderRadius: "999px",
        color: inverse ? "#fff" : "var(--color-text)",
        padding: "0 0.65rem",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M12.5 4.5 6.8 10l5.7 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: "0.9rem", fontWeight: 650 }}>{t("nav.back")}</span>
    </button>
  );
}
