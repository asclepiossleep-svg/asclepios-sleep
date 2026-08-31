import { useNavigate } from "react-router-dom";
import { useMusicPlayer } from "../state/useMusicPlayer";
import { pause, resume, stop, seek, setVolume } from "../audio/musicPlayer";
import { t } from "../i18n";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Full-screen "Now Playing" — Music Library V1, 31 Aug 2026. Edmund's
 * explicit brief: when playing a track, the experience should look like
 * the design moodboard's Sleep Player screen (full-bleed artwork, big
 * circular play/pause, seekable progress bar with times either side) —
 * not just the small persistent bottom bar (MusicPlayerBar.tsx), which
 * still exists and still keeps audio going while browsing elsewhere, but
 * now acts as a "tap to reopen this screen" affordance rather than the
 * only playback UI.
 *
 * Deliberately doesn't invent controls that don't do anything — the
 * moodboard's Timer/Mix icons aren't wired to a real feature yet, so this
 * ships with the controls that actually work: play/pause, seek, volume,
 * stop. Timer (auto-stop after N minutes) is a natural next addition once
 * the rest of the redesign catches up.
 */
export default function NowPlaying() {
  const navigate = useNavigate();
  const { track, playing, currentTime, duration, volume } = useMusicPlayer();

  if (!track) {
    navigate("/music", { replace: true });
    return null;
  }

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        backgroundColor: "#141414",
      }}
    >
      {track.artworkUrl && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${track.artworkUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(2px) brightness(0.75)",
            transform: "scale(1.05)",
          }}
        />
      )}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, padding: "1.25rem 1.5rem", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={t("nav.home")}
          style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", fontSize: "1.3rem" }}
        >
          ‹
        </button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", textAlign: "center", gap: "0.35rem", paddingBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.6rem", margin: 0, fontWeight: 700 }}>{track.title}</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>{track.artist ?? "Asclepios Sleep"}</p>
        </div>

        <button
          onClick={() => (playing ? pause() : resume())}
          aria-label={playing ? t("player.pause") : t("player.play")}
          style={{
            alignSelf: "center",
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: "#fff",
            color: "#141414",
            border: "none",
            fontSize: "1.8rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.75rem",
          }}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <div style={{ marginBottom: "1.5rem" }}>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={!duration}
            style={{ width: "100%" }}
            aria-label={t("player.timeLeftLabel")}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", opacity: 0.85 }}>
            <span>{formatTime(currentTime)}</span>
            <span>{duration ? formatTime(duration) : "--:--"}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <span aria-hidden="true">🔈</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ flex: 1 }}
            aria-label={t("player.volume")}
          />
          <span aria-hidden="true">🔊</span>
        </div>

        <button
          onClick={() => {
            stop();
            navigate("/music");
          }}
          style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: "var(--radius)", padding: "0.75rem" }}
        >
          {t("music.stop")}
        </button>
      </div>
    </div>
  );
}
