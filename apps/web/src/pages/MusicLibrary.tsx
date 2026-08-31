import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";
import { playTrack, PlayableTrack } from "../audio/musicPlayer";
import { useMusicPlayer } from "../state/useMusicPlayer";
import PageHeader from "../components/PageHeader";
import BottomNav from "../components/BottomNav";

interface Track {
  id: string;
  title: string;
  artist: string | null;
  audioUrl: string | null;
  artworkUrl: string | null;
  primaryCategory: string;
}

const CATEGORY_ORDER = ["SLEEP_SOUNDS", "MUSIC", "SOUND_HEALING", "MEDITATION"];

/**
 * Music Library V1 — Phase 3 (31 Aug 2026), Edmund's brief: classify every
 * track by type, show a name and picture for each, let the user pick one
 * to just play — no need to start a sleep session — looping until they
 * stop it themselves. Playback itself lives in audio/musicPlayer.ts (a
 * persistent singleton, not owned by this page) so it keeps going after
 * the user navigates away; see components/MusicPlayerBar.tsx.
 */
export default function MusicLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const { track: nowPlaying, playing } = useMusicPlayer();
  const navigate = useNavigate();

  useEffect(() => {
    setStatus("loading");
    api
      .get<{ tracks: Track[] }>("/music/tracks")
      .then((r) => {
        setTracks(r.tracks);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  function play(track: Track) {
    if (!track.audioUrl) return;
    const playable: PlayableTrack = { id: track.id, title: track.title, artist: track.artist, audioUrl: track.audioUrl, artworkUrl: track.artworkUrl };
    playTrack(playable);
    // 31 Aug 2026 — Edmund's brief: picking a track should open the
    // full-screen immersive player (design moodboard's Sleep Player
    // screen), not just start the small bottom bar quietly.
    navigate("/music/now-playing");
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({ category: cat, items: tracks.filter((tr) => tr.primaryCategory === cat) })).filter(
    (g) => g.items.length > 0
  );

  return (
    <div className="screen">
      <PageHeader title={t("music.title")} subtitle={t("music.subtitle")} />

      {status === "loading" && <p className="muted">{t("setup.loading")}</p>}
      {status === "error" && <p className="muted">{t("setup.wallpaper.loadError")}</p>}
      {status === "ready" && tracks.length === 0 && <p className="muted">{t("library.empty")}</p>}

      {grouped.map((g) => (
        <div key={g.category}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{t(`music.category.${g.category}`)}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            {g.items.map((tr) => {
              const isCurrent = nowPlaying?.id === tr.id;
              return (
                <button
                  key={tr.id}
                  onClick={() => play(tr)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "0.4rem",
                    padding: "0.85rem",
                    height: "6rem",
                    borderRadius: "var(--radius)",
                    border: isCurrent ? "3px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: tr.artworkUrl ? `center/cover url(${tr.artworkUrl})` : "var(--color-surface)",
                    color: "#fff",
                    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    justifyContent: "flex-end",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <strong style={{ fontSize: "0.85rem" }}>
                    {isCurrent && (playing ? "▶️ " : "⏸ ")}
                    {tr.title}
                  </strong>
                  {tr.artist && <span style={{ fontSize: "0.7rem", opacity: 0.9 }}>{tr.artist}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <BottomNav />
    </div>
  );
}
