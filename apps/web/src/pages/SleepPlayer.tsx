import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";
import { useSession } from "../state/session";
import { SNOOZE_MINUTES, SYNTH_TRACKS, isSynthTrack } from "@asclepios/shared";
import { SleepAudioEngine } from "../audio/synthEngine";

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

// Music Library (29 Aug 2026) — Edmund's brief: let the user turn
// background music off entirely. Tonight.tsx now only ever sends either a
// real SYNTH_TRACKS code or an explicit `null` (the user's "🔇 Off" pick),
// so null here means "play nothing" rather than the old "default to the
// first track" fallback. An unrecognised *non-null* value (a stale/legacy
// id) still falls back to the first track rather than going silent.
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
 * Requirement Recovery Matrix #29 — now drives real Web Audio playback via
 * SleepAudioEngine instead of being a silent shell. Started from the same
 * user gesture as the "開始瞓覺" tap on Tonight (this screen is reached by
 * client-side navigation from that click, no full page reload in between).
 */
export default function SleepPlayer() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [session, setSession] = useState<SleepSessionData | null>((location.state as any)?.session ?? null);
  const [woken, setWoken] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [remaining, setRemaining] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useSession();
  const heroUrl = user?.wallpaper?.imageUrl ?? DEFAULT_PLAYER_WALLPAPER;
  const engineRef = useRef<SleepAudioEngine>(new SleepAudioEngine());
  const fadedRef = useRef(false);

  // Recover session details on a hard refresh (navigate() state is gone then).
  useEffect(() => {
    if (session || !sessionId) return;
    api.get<{ session: SleepSessionData }>(`/sleep-session/${sessionId}`).then((r) => setSession(r.session));
  }, [session, sessionId]);

  // Start real audio the moment we know what to play — unless the user
  // chose "🔇 Off" on Tonight, in which case there's nothing to start.
  useEffect(() => {
    if (!session) return;
    const engine = trackEngineFor(session.sleepAudioId);
    if (engine) {
      engineRef.current.play(engine, volume);
      setPlaying(true);
    }
    setRemaining(session.sleepAudioDurationSeconds ?? 3600);
    return () => {
      engineRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // Countdown + automatic fade-out near the end.
  useEffect(() => {
    if (!session || woken) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        const next = prev - 1;
        const fadeAt = session.sleepAudioFadeOutSeconds ?? 120;
        if (!fadedRef.current && next <= fadeAt && next > 0) {
          fadedRef.current = true;
          engineRef.current.fadeOutAndStop(next);
        }
        if (next <= 0) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session, woken]);

  function toggleTrack() {
    if (!session) return;
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
    engineRef.current.setVolume(v);
  }

  async function imAwake() {
    engineRef.current.stop();
    engineRef.current.playWakeChime(session?.wakeStyle ?? "NORMAL");
    setPlaying(false);
    await api.post(`/sleep-session/${sessionId}/wake`);
    setWoken(true);
  }

  async function snooze(minutes: number) {
    await api.post(`/sleep-session/${sessionId}/snooze`, { minutes });
  }

  async function goToCheckin() {
    engineRef.current.stop();
    await api.post(`/sleep-session/${sessionId}/stop`);
    navigate("/checkin", { state: { sessionId } });
  }

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
        }}
      >
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <p style={{ color: "#f6f5fa", opacity: 0.85 }}>{t("player.windDown")}</p>
          <h1>
            {session && isSynthTrack(session.sleepAudioId)
              ? t(`tonight.track.${session.sleepAudioId}`)
              : session && session.sleepAudioId === null
                ? t("tonight.track.OFF")
                : t("player.trackName")}
          </h1>
          {!woken && remaining !== null && (
            <>
              <p style={{ color: "#f6f5fa", opacity: 0.85, marginBottom: "0.25rem" }}>{t("player.timeLeftLabel")}</p>
              <p style={{ fontSize: "1.5rem", fontVariantNumeric: "tabular-nums" }}>{formatClock(remaining)}</p>
            </>
          )}
        </div>

        {/* Music Library (29 Aug 2026) — no play/pause/volume card at all
            when the user chose "🔇 Off" on Tonight; nothing to control. */}
        {!woken && session?.sleepAudioId !== null && (
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
      </div>
    </div>
  );
}
