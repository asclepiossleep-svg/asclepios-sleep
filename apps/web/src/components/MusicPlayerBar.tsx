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
 */
export default function MusicPlayerBar() {
  const { track, playing } = useMusicPlayer();
  const location = useLocation();
  const navigate = useNavigate();
  if (!track || location.pathname === "/music/now-playing") return null;

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
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
      <button onClick={() => (playing ? pause() : resume())} aria-label={playing ? t("player.pause") : t("player.play")}>
        {playing ? "⏸" : "▶️"}
      </button>
      <button onClick={stop} aria-label={t("music.stop")}>
        ⏹
      </button>
    </div>
  );
}
