import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";
import { SNOOZE_MINUTES, SYNTH_TRACKS, isSynthTrack } from "@asclepios/shared";
import { SleepAudioEngine } from "../audio/synthEngine";

interface SleepSessionData {
  id: string;
  sleepAudioId: string | null;
  sleepAudioDurationSeconds: number | null;
  sleepAudioFadeOutSeconds: number;
  wakeStyle: "GENTLE" | "NORMAL" | "STRONG";
}

function trackEngineFor(sleepAudioId: string | null) {
  const match = SYNTH_TRACKS.find((tr) => tr.code === sleepAudioId);
  // Legacy/unknown session data still gets real sound rather than silence.
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
  const engineRef = useRef<SleepAudioEngine>(new SleepAudioEngine());
  const fadedRef = useRef(false);

  // Recover session details on a hard refresh (navigate() state is gone then).
  useEffect(() => {
    if (session || !sessionId) return;
    api.get<{ session: SleepSessionData }>(`/sleep-session/${sessionId}`).then((r) => setSession(r.session));
  }, [session, sessionId]);

  // Start real audio the moment we know what to play.
  useEffect(() => {
    if (!session) return;
    engineRef.current.play(trackEngineFor(session.sleepAudioId), volume);
    setPlaying(true);
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
    if (playing) {
      engineRef.current.stop();
      setPlaying(false);
    } else {
      fadedRef.current = false;
      engineRef.current.play(trackEngineFor(session.sleepAudioId), volume);
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
    <div
      className="screen"
      style={{
        justifyContent: "space-between",
        background: "radial-gradient(circle at top, var(--color-accent) 0%, var(--color-bg) 70%)",
        minHeight: "100vh",
      }}
    >
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <p className="muted">{t("player.windDown")}</p>
        <h1>{session && isSynthTrack(session.sleepAudioId) ? t(`tonight.track.${session.sleepAudioId}`) : t("player.trackName")}</h1>
        {!woken && remaining !== null && (
          <>
            <p className="muted" style={{ marginBottom: "0.25rem" }}>
              {t("player.timeLeftLabel")}
            </p>
            <p style={{ fontSize: "1.5rem", fontVariantNumeric: "tabular-nums" }}>{formatClock(remaining)}</p>
          </>
        )}
      </div>

      {!woken && (
        <div className="card" style={{ width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <button onClick={toggleTrack}>{playing ? t("player.pause") : t("player.play")}</button>
            <span className="muted">{t("player.volume")}</span>
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
        <div className="card">
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
  );
}
