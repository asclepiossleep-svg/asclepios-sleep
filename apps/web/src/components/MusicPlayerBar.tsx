import { useLocation, useNavigate } from "react-router-dom";
import { useMusicPlayer } from "../state/useMusicPlayer";
import { pause, resume, stop } from "../audio/musicPlayer";
import { t } from "../i18n";

/**
 * Music Library V1 — Phase 3 (31 Aug 2026). Rendered once, high in the
 * component tree (see App.tsx, same placement pattern as AppBackground),
 * so it survives page navigation instead of being torn down whenever the
 * user leaves the Music Library page — that's the whole point of "play
 * only, no need when sleeping, repeat until stop": it should keep going in
 * the background while they use the rest of the app.
 *
 * 31 Aug 2026 — now acts as a "tap to reopen" affordance for the
 * full-screen NowPlaying view (design moodboard's Sleep Player screen) —
 * hidden on that screen itself so it doesn't duplicate its own controls.
 *
 * 5 Sep 2026 — also hidden on /player/:sessionId (SleepPlayer.tsx). That
 * screen has its own play/pause/volume card for tonight's sleep audio
 * (which can itself be a Music Library track); without this exclusion this
 * bar was floating a second, redundant play/pause control on top of the
 * full-screen session's own "I'm Awake" button.
 */
// Mobile readability audit (5 Sep 2026) — the pages that also render
// BottomNav (see BottomNav.tsx's own comment for the underlying bug this
// bar shared with it). This bar is rendered once, globally, outside any
// page's own layout, so it can't reserve flow space the way BottomNav's
// spacer does — it has to know whether the current route already has a
// fixed tab bar to stack above instead of on top of.
const BOTTOM_NAV_ROUTES = new Set(["/home", "/tonight", "/review", "/settings", "/programmes", "/music", "/learn"]);

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="3.2" height="12" rx="1" fill="currentColor" />
      <rect x="11.8" y="4" width="3.2" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 4.2v11.6a.8.8 0 0 0 1.22.68l9.3-5.8a.8.8 0 0 0 0-1.36l-9.3-5.8A.8.8 0 0 0 6 4.2Z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export default function MusicPlayerBar() {
  const { track, playing } = useMusicPlayer();
  const location = useLocation();
  const navigate = useNavigate();
  if (!track || location.pathname === "/music/now-playing" || location.pathname.startsWith("/player/")) return null;

  const stacksAboveBottomNav = BOTTOM_NAV_ROUTES.has(location.pathname);

  return (
    <div
      style={{
        position: "fixed",
        bottom: stacksAboveBottomNav ? "calc(4.25rem + env(safe-area-inset-bottom, 0px))" : "env(safe-area-inset-bottom, 0px)",
        left: 0,
        right: 0,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.6rem 1rem",
        background: "var(--color-surface-veil)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <button
        onClick={() => navigate("/music/now-playing")}
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left" }}
      >
        {track.artworkUrl && (
          <img
            src={track.artworkUrl}
            alt=""
            aria-hidden="true"
            style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</strong>
          {track.artist && <span className="muted" style={{ fontSize: "0.75rem" }}>{track.artist}</span>}
        </div>
      </button>
      <button
        onClick={() => (playing ? pause() : resume())}
        aria-label={playing ? t("player.pause") : t("player.play")}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: "var(--touch-target-min)", minHeight: "var(--touch-target-min)" }}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        onClick={stop}
        aria-label={t("music.stop")}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: "var(--touch-target-min)", minHeight: "var(--touch-target-min)" }}
      >
        <StopIcon />
      </button>
    </div>
  );
}
