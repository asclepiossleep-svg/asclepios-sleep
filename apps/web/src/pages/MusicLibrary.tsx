import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";
import { playTrack, PlayableTrack } from "../audio/musicPlayer";
import { useMusicPlayer } from "../state/useMusicPlayer";
import { useSession } from "../state/session";
import { SYNTH_TRACKS, type SynthTrackCode } from "@asclepios/shared";
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
 *
 * Fix #5.1 (2 Sep 2026, Repair Plan Fix #5) — Tonight previously duplicated
 * every synthesized ambience/noise track (Pink Noise, 432Hz, etc.) as its
 * own row of quick-pick buttons, on top of a separate "browse library"
 * toggle for real tracks — two pickers for one decision. This page is now
 * the single place both kinds of audio are chosen from. When opened as
 * `/music?selectFor=tonight` (Tonight's "Choose Music" entry point), tiles
 * select-and-persist (same /preferences write Tonight used to do directly)
 * instead of preview-playing, then return to Tonight. Opened normally
 * (bottom nav), tiles still preview-play as before — synthesized tracks
 * are select-only everywhere (no standalone preview engine outside a
 * session yet), so they're labelled accordingly rather than looking
 * clickable-but-silently-broken.
 */
export default function MusicLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const { track: nowPlaying, playing } = useMusicPlayer();
  const { user, updateUser } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectingForTonight = searchParams.get("selectFor") === "tonight";

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

  function selectPreference(preferredSleepAudioId: string) {
    api
      .patch<{ preferredSleepAudioId: string | null; audioMuted: boolean }>("/preferences", { preferredSleepAudioId, audioMuted: false })
      .then((res) => {
        updateUser({ preferredSleepAudioId: res.preferredSleepAudioId, audioMuted: res.audioMuted });
        navigate("/tonight");
      })
      .catch(() => {});
  }

  function play(track: Track) {
    if (selectingForTonight) return selectPreference(track.id);
    if (!track.audioUrl) return;
    const playable: PlayableTrack = { id: track.id, title: track.title, artist: track.artist, audioUrl: track.audioUrl, artworkUrl: track.artworkUrl };
    playTrack(playable);
    // 31 Aug 2026 — Edmund's brief: picking a track should open the
    // full-screen immersive player (design moodboard's Sleep Player
    // screen), not just start the small bottom bar quietly.
    navigate("/music/now-playing");
  }

  function selectSynth(code: SynthTrackCode) {
    if (selectingForTonight) return selectPreference(code);
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({ category: cat, items: tracks.filter((tr) => tr.primaryCategory === cat) })).filter(
    (g) => g.items.length > 0
  );

  return (
    <div className="screen">
      <PageHeader
        title={t("music.title")}
        subtitle={selectingForTonight ? t("music.selectForTonightSubtitle") : t("music.subtitle")}
      />

      <div>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{t("music.category.AMBIENCE")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          {SYNTH_TRACKS.map((track) => {
            const isCurrent = user?.preferredSleepAudioId === track.code && !user?.audioMuted;
            return (
              <button
                key={track.code}
                onClick={() => selectSynth(track.code)}
                disabled={!selectingForTonight}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  gap: "0.3rem",
                  padding: "0.85rem",
                  height: "5rem",
                  borderRadius: "var(--radius)",
                  border: isCurrent ? "3px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  width: "100%",
                  textAlign: "left",
                  opacity: selectingForTonight ? 1 : 0.7,
                }}
              >
                <strong style={{ fontSize: "0.85rem" }}>{t(`tonight.track.${track.code}`)}</strong>
                {!selectingForTonight && <span style={{ fontSize: "0.7rem" }} className="muted">{t("music.ambienceSelectOnly")}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {status === "loading" && <p className="muted">{t("setup.loading")}</p>}
      {status === "error" && <p className="muted">{t("setup.wallpaper.loadError")}</p>}
      {status === "ready" && tracks.length === 0 && <p className="muted">{t("library.empty")}</p>}

      {grouped.map((g) => (
        <div key={g.category}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{t(`music.category.${g.category}`)}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            {g.items.map((tr) => {
              const isCurrent = selectingForTonight ? user?.preferredSleepAudioId === tr.id && !user?.audioMuted : nowPlaying?.id === tr.id;
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
                    {!selectingForTonight && isCurrent && (playing ? "▶️ " : "⏸ ")}
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
