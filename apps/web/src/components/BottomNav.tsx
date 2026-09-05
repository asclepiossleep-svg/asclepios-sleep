import { NavLink } from "react-router-dom";
import { t } from "../i18n";

// Fix #5.5 — line icons in the same stroke idiom as Login.tsx's inline SVGs
// (20x20 viewBox, currentColor, 1.4 stroke width, round caps/joins). Replaces
// the raw emoji so the nav reads as one consistent icon system.
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 15.5V6.8c0-.8.5-1.4 1.3-1.6L10 4l4.7 1.2c.8.2 1.3.8 1.3 1.6v8.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M13.6 4.4a6.6 6.6 0 1 0 1.9 9.9A5.3 5.3 0 0 1 13.6 4.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 14.5 8 9.8l3 3 5.5-6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6.5h3.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2M5.5 5.5l1.4 1.4M13.1 13.1l1.4 1.4M14.5 5.5l-1.4 1.4M6.9 13.1l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Design moodboard 28 Aug 2026 — persistent bottom navigation across the
 * post-setup screens (Home / Tonight / Review / Settings), so the deeper
 * setup screens (Wallpaper, Theme Colour) never strand the user without a
 * way back to the main flow.
 */
const ITEMS = [
  { to: "/home", key: "nav.home", Icon: HomeIcon },
  { to: "/tonight", key: "nav.tonight", Icon: MoonIcon },
  { to: "/review", key: "nav.review", Icon: TrendUpIcon },
  { to: "/settings", key: "nav.settings", Icon: SettingsIcon },
] as const;

export default function BottomNav() {
  return (
    <>
      {/* Mobile readability audit (5 Sep 2026) — the nav below is `position:
          fixed` (viewport-pinned, not document-flow), so this spacer is what
          actually reserves room for it at the end of each page's scrollable
          content. Without it, the fixed bar permanently overlapped whatever
          card/button happened to land last (Tonight's wake-alarm toggle,
          Review's disclaimer text, etc.) on any screen taller than one
          viewport — `position: sticky` alone did this too, since a sticky
          last-child engages the moment content exceeds the viewport, not
          only once truly scrolled to the bottom. Height matches the nav's
          own content box (padding + icon + label) plus the safe-area inset
          it also reserves below. */}
      <div aria-hidden="true" style={{ height: "calc(4.25rem + env(safe-area-inset-bottom, 0px))" }} />
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 5,
          display: "flex",
          justifyContent: "space-around",
          background: "var(--color-surface-veil)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderTop: "1px solid var(--color-border)",
          padding: "0.5rem 0",
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
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
            <item.Icon />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
