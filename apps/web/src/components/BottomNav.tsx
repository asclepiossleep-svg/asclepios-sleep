import { NavLink } from "react-router-dom";
import { t } from "../i18n";

/**
 * Design moodboard 28 Aug 2026 — persistent bottom navigation across the
 * post-setup screens (Home / Tonight / Review / Settings), so the deeper
 * setup screens (Wallpaper, Theme Colour) never strand the user without a
 * way back to the main flow.
 */
const ITEMS = [
  { to: "/home", key: "nav.home", icon: "🏠" },
  { to: "/tonight", key: "nav.tonight", icon: "🌙" },
  { to: "/review", key: "nav.review", icon: "📈" },
  { to: "/settings", key: "nav.settings", icon: "⚙️" },
] as const;

export default function BottomNav() {
  return (
    <nav
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        background: "var(--color-surface-veil)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "1px solid var(--color-border)",
        padding: "0.5rem 0",
        marginTop: "1rem",
      }}
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.15rem",
            fontSize: "0.75rem",
            textDecoration: "none",
            color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
            minWidth: "var(--touch-target-min)",
            minHeight: "var(--touch-target-min)",
            justifyContent: "center",
          })}
        >
          <span aria-hidden style={{ fontSize: "1.25rem" }}>
            {item.icon}
          </span>
          <span>{t(item.key)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
