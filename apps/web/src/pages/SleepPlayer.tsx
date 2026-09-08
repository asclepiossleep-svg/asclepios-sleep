import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";
import { useSession } from "../state/session";
import { SNOOZE_MINUTES, SYNTH_TRACKS, isSynthTrack } from "@asclepios/shared";
import { SleepAudioEngine } from "../audio/synthEngine";
import * as musicPlayer from "../audio/musicPlayer";

// App-wide wallpaper (29 Aug 2026) — Tonight.tsx sends
// `wallpaperId: user?.wallpaperId ?? "WALL_MOON_LAKE_04"` when starting a
// session, so this mirrors that same fallback (WALL_MOON_LAKE_04's imageUrl
// is now /wallpapers/moonlit-lake.webp, see demoSeed.ts) rather than doing a
// second round trip to resolve wallpaperId -> imageUrl for a value the
// session already has via useSession().
const DEFAULT_PLAYER_WALLPAPER = "/wallpapers/moonlit-lake.webp";

interface SleepSessionData {
  id: string;
  sleepAudioId: string | null;
  sleepAudioDurationSeconds: number | null;
  sleepAudioFadeOutSeconds: number;
  wakeStyle: "GENTLE" | "NORMAL" | "STRONG";
}

interface LibraryTrackLite {
  id: string;
  title: string;
  artist: string | null;
  audioUrl: string | null;
  artworkUrl: string | null;
}

function trackEngineFor(sleepAudioId: string | null) {
  if (sleepAudioId === null) return null;
  const match = SYNTH_TRACKS.find((tr) => tr.code === sleepAudioId);
  return (match ?? SYNTH_TRACKS[0]).engine;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

/**
 * Supplement 07 §10-16 — Sleep Player / Wake Engine screen. Full-screen
 * wallpaper, no technical detail (percentages, volume curves) surfaced to
 * the user — only feelings/presets, per §14.
 *
 * 31 Aug 2026 correction — a session's sleepAudioId can now be either a
 * built-in SYNTH_TRACKS code (played via SleepAudioEngine's Web Audio
 * oscillators, as before) or a real Music Library track id (played via
 * audio/musicPlayer.ts's persistent <audio> element, resolved here from
 * GET /music/tracks since the session row only stores the id). Both paths
 * share the same play/pause/volume card and the same fade-out-near-the-end
 * behaviour — see musicPlayer.ts's fadeOutAndStop, added specifically for
 * this. `remaining === null` with duration mode UNTIL_WAKE/ALL_NIGHT means
 * "open-ended" — no countdown or auto fade-out at all, matching the
 * schema's own null-seconds-by-definition for those two modes.
 */
export default function SleepPlayer() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [session, setSession] = useState<SleepSessionData | null>((location.state as any)?.session ?? null);
  const [sessionLoadFailed, setSessionLoadFailed] = useState(false);
  const [woken, setWoken] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [realTrack, setRealTrack] = useState<LibraryTrackLite | null>(null);
  const navigate = useNavigate();
  const { user } = useSession();
  const heroUrl = user?.wallpaper?.imageUrl ?? DEFAULT_PLAYER_WALLPAPER;
  const engineRef = useRef<SleepAudioEngine>(new SleepAudioEngine());
  const fadedRef = useRef(false);
  const isRealTrack = !!session?.sleepAudioId && !isSynthTrack(session.sleepAudioId);

  // Recover session details on a hard refresh (navigate() state is gone then).
  // A stale link or a session that has already ended can 404 here — without
  // a .catch this left the screen stuck forever with no way out.
  useEffect(() => {
    if (session || !sessionId) return;
    api
      .get<{ session: SleepSessionData }>(`/sleep-session/${sessionId}`)
      .then((r) => setSession(r.session))
      .catch(() => setSessionLoadFailed(true));
  }, [session, sessionId]);

  // A real Music Library track id needs its audioUrl/title/artwork resolved
  // before it can be played — the session row only ever stores the id.
  useEffect(() => {
    if (!session || !isRealTrack) return;
    api
      .get<{ tracks: LibraryTrackLite[] }>("/music/tracks")
      .then((r) => setRealTrack(r.tracks.find((tr) => tr.id === session.sleepAudioId) ?? null));
  }, [session, isRealTrack]);

  // Start real audio the moment we know what to play — unless the user
  // chose "🔇 Off" on Sleep Setting, in which case there's nothing to start.
  useEffect(() => {
    if (!session) return;
    if (isRealTrack) {
      if (!realTrack?.audioUrl) return; // still resolving, or track vanished
      musicPlayer.playTrack({ id: realTrack.id, title: realTrack.title, artist: realTrack.artist, audioUrl: realTrack.audioUrl, artworkUrl: realTrack.artworkUrl });
      musicPlayer.setVolume(volume);
      setPlaying(true);
    } else {
      const engine = trackEngineFor(session.sleepAudioId);
      if (engine) {
        engineRef.current.play(engine, volume);
        setPlaying(true);
      }
    }
    setRemaining(session.sleepAudioDurationSeconds ?? null);
    return () => {
      engineRef.current.stop();
      if (isRealTrack) musicPlayer.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, isRealTrack, realTrack?.id]);

  // Countdown + automatic fade-out near the end. A null sleepAudioDurationSeconds
  // (UNTIL_WAKE / ALL_NIGHT) means open-ended — no countdown, no auto-stop.
  useEffect(() => {
    if (!session || woken || session.sleepAudioDurationSeconds === null) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        const next = prev - 1;
        const fadeAt = session.sleepAudioFadeOutSeconds ?? 120;
        if (!fadedRef.current && next <= fadeAt && next > 0) {
          fadedRef.current = true;
          if (isRealTrack) musicPlayer.fadeOutAndStop(next);
          else engineRef.current.fadeOutAndStop(next);
        }
        if (next <= 0) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session, woken, isRealTrack]);

  function toggleTrack() {
    if (!session) return;
    if (isRealTrack) {
      if (!realTrack) return;
      if (playing) {
        musicPlayer.pause();
        setPlaying(false);
      } else {
        musicPlayer.resume();
        setPlaying(true);
      }
      return;
    }
    const engine = trackEngineFor(session.sleepAudioId);
    if (!engine) return; // "🔇 Off" was chosen — nothing to toggle
    if (playing) {
      engineRef.current.stop();
      setPlaying(false);
    } else {
      fadedRef.current = false;
      engineRef.current.play(engine, volume);
      setPlaying(true);
    }
  }

  function changeVolume(v: number) {
    setVolume(v);
    if (isRealTrack) musicPlayer.setVolume(v);
    else engineRef.current.setVolume(v);
  }

  async function imAwake() {
    engineRef.current.stop();
    if (isRealTrack) musicPlayer.stop();
    engineRef.current.playWakeChime(session?.wakeStyle ?? "NORMAL");
    setPlaying(false);
    // The local session is already over regardless of whether the backend
    // call succeeds — a failed request must not strand the user on a
    // "still sleeping" screen with the audio already stopped.
    try {
      await api.post(`/sleep-session/${sessionId}/wake`);
    } catch {
      // best-effort; UI still advances below
    }
    setWoken(true);
  }

  async function snooze(minutes: number) {
    await api.post(`/sleep-session/${sessionId}/snooze`, { minutes });
  }

  async function goToCheckin() {
    engineRef.current.stop();
    if (isRealTrack) musicPlayer.stop();
    try {
      await api.post(`/sleep-session/${sessionId}/stop`);
    } catch {
      // best-effort; Morning Check-in's own pending-session recovery
      // (see checkin.pending-session) covers the session lookup either way
    }
    navigate("/checkin", { state: { sessionId } });
  }

  const trackDisplayName = session
    ? isSynthTrack(session.sleepAudioId)
      ? t(`tonight.track.${session.sleepAudioId}`)
      : session.sleepAudioId === null
        ? t("tonight.track.OFF")
        : realTrack?.title ?? t("player.trackName")
    : t("player.trackName");

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      {/* Full-screen wallpaper (29 Aug 2026) — replaces the old flat
          radial-gradient placeholder. Reuses the .app-wallpaper-bg/-scrim
          layers from tokens.css (AppBackground's own classes) rather than
          Login's hero classes — Login's day/night crossfade would hide
          this single photo entirely at night (its --day variant fades to
          opacity:0 under [data-theme="night"]), which is wrong here: one
          wallpaper, shown as-is regardless of theme. Fixed light text
          throughout this screen, same reasoning as Login: a photo can't
          guarantee --color-text's usual contrast either way. */}
      <div className="app-wallpaper-bg" style={{ position: "fixed", backgroundImage: `url(${heroUrl})` }} aria-hidden="true" />
      <div className="app-wallpaper-scrim" style={{ position: "fixed" }} aria-hidden="true" />

      <div
        className="screen"
        style={{
          position: "relative",
          zIndex: 1,
          justifyContent: "space-between",
          minHeight: "100vh",
          color: "#f6f5fa",
          // Unlike scrolling pages, this screen pins its primary CTA to the
          // bottom edge via flex, not normal document flow — so it needs
          // its own home-indicator safe-area padding, same as BottomNav and
          // MusicPlayerBar already account for.
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {sessionLoadFailed ? (
          <div style={{ textAlign: "center", margin: "auto 0" }}>
            <p style={{ color: "#f6f5fa", opacity: 0.85, marginBottom: "1rem" }}>{t("player.sessionLoadFailed")}</p>
            <button className="primary" onClick={() => navigate("/tonight")}>
              {t("player.backToTonight")}
            </button>
          </div>
        ) : (
          <>
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <p style={{ color: "#f6f5fa", opacity: 0.85 }}>{t("player.windDown")}</p>
          <h1>{trackDisplayName}</h1>
          {!woken && remaining !== null && (
            <>
              <p style={{ color: "#f6f5fa", opacity: 0.85, marginBottom: "0.25rem" }}>{t("player.timeLeftLabel")}</p>
              <p style={{ fontSize: "1.5rem", fontVariantNumeric: "tabular-nums" }}>{formatClock(remaining)}</p>
            </>
          )}
        </div>

        {/* No play/pause/volume card at all when the user chose "🔇 Off"
            on Sleep Setting; nothing to control. Also gated on `session`
            actually being loaded — `session?.sleepAudioId !== null` was
            true while session was still null (undefined !== null), so this
            card used to flash briefly before the session ever loaded. */}
        {!woken && session && session.sleepAudioId !== null && (
          <div
            className="card"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(18, 20, 34, 0.42)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#f6f5fa",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <button onClick={toggleTrack}>{playing ? t("player.pause") : t("player.play")}</button>
              <span style={{ color: "#f6f5fa", opacity: 0.85 }}>{t("player.volume")}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                style={{ flex: 1, marginLeft: "0.75rem" }}
              />
            </div>
          </div>
        )}

        {!woken ? (
          <button className="primary" onClick={imAwake} style={{ width: "100%" }}>
            {t("player.imAwake")}
          </button>
        ) : (
          <div
            className="card"
            style={{
              background: "rgba(18, 20, 34, 0.42)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#f6f5fa",
            }}
          >
            <p>{t("player.snoozeQuestion")}</p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {SNOOZE_MINUTES.map((m) => (
                <button key={m} onClick={() => snooze(m)}>
                  {m} {t("player.minutesSuffix")}
                </button>
              ))}
            </div>
            <button className="primary" onClick={goToCheckin} style={{ width: "100%" }}>
              {t("player.continueToCheckin")}
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
