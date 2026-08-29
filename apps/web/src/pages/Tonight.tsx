// redeploy trigger 29 Aug 2026 (b)
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t, getLocale } from "../i18n";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";
import { SYNTH_TRACKS, SLEEP_AUDIO_DURATION_PRESETS, type SynthTrackCode } from "@asclepios/shared";

interface ProtocolStep {
  title: string;
  instruction: string;
}

interface TonightStep {
  stepCode: string;
  productId?: string;
  productName?: string;
  mode?: "RHYTHM" | "CALM" | "BODY" | "SUPPORT";
  protocolSteps?: ProtocolStep[];
}

function stepLabel(step: TonightStep): string {
  if (step.stepCode === "PRODUCT") return `${t("tonight.step.useProduct")} ${step.productName ?? ""}`.trim();
  if (step.stepCode === "BREATHING") return t("tonight.step.breathing");
  if (step.stepCode === "MUSIC") return t("tonight.step.music");
  return step.stepCode;
}

/**
 * Doc 01 §2/§4 — night home: "夜晚首頁突出 Tonight's Plan + START SLEEP" and
 * never more than 1-3 steps, however many products the user owns.
 */
export default function Tonight() {
  const [steps, setSteps] = useState<TonightStep[]>([]);
  const [routineLevel, setRoutineLevel] = useState<number | null>(null);
  const [stepStatus, setStepStatus] = useState<Record<string, "DONE" | "SKIPPED">>({});
  // Music Library (29 Aug 2026) — "OFF" is a client-only sentinel (not a
  // SYNTH_TRACKS code) for "no background music tonight". Initialized from
  // the user's persisted choice once /preferences has loaded (see the
  // effect below); defaults to the first SYNTH_TRACKS entry only if the
  // user has never chosen one before.
  const [trackCode, setTrackCode] = useState<SynthTrackCode | "OFF">(SYNTH_TRACKS[0].code);
  const [durationLabel, setDurationLabel] = useState<string>("1 hr");
  const [openProtocol, setOpenProtocol] = useState(false);
  const { user, logout, updateUser } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<{ steps: TonightStep[]; routineLevel: number }>(`/tonight?locale=${encodeURIComponent(getLocale())}`).then((r) => {
      setSteps(r.steps);
      setRoutineLevel(r.routineLevel);
    });
  }, []);

  // Music Library (29 Aug 2026) — apply the persisted choice once (not on
  // every user change) so picking a different track this session doesn't
  // get overwritten by a stale /preferences response landing late.
  const appliedSavedTrack = useRef(false);
  useEffect(() => {
    if (appliedSavedTrack.current || !user) return;
    if (user.audioMuted) {
      setTrackCode("OFF");
    } else if (user.preferredSleepAudioId && SYNTH_TRACKS.some((tr) => tr.code === user.preferredSleepAudioId)) {
      setTrackCode(user.preferredSleepAudioId as SynthTrackCode);
    }
    appliedSavedTrack.current = true;
  }, [user]);

  function chooseTrack(next: SynthTrackCode | "OFF") {
    setTrackCode(next);
    // Persist immediately — same "tap = saved" pattern as Wallpaper/Theme
    // Colour, so "turn off / change background music" sticks for next time.
    api
      .patch<{ preferredSleepAudioId: string | null; audioMuted: boolean }>("/preferences", {
        preferredSleepAudioId: next === "OFF" ? null : next,
        audioMuted: next === "OFF",
      })
      .then((res) => updateUser({ preferredSleepAudioId: res.preferredSleepAudioId, audioMuted: res.audioMuted }))
      .catch(() => {});
  }

  async function mark(step: TonightStep, status: "DONE" | "SKIPPED") {
    setStepStatus((s) => ({ ...s, [step.stepCode]: status }));
    await api.post("/tonight/log-step", { stepCode: step.stepCode, status, productId: step.productId });
  }

  async function startSleep() {
    const res = await api.post<{ session: any }>("/sleep-session/start", {
      sleepAudioDurationMode: "FIXED",
      presetLabel: durationLabel,
      sleepAudioId: trackCode === "OFF" ? null : trackCode,
      wallpaperId: user?.wallpaperId ?? "WALL_MOON_LAKE_04",
      wakeStyle: "NORMAL",
      snoozeMinutes: 10,
    });
    navigate(`/player/${res.session.id}`, { state: { session: res.session } });
  }

  return (
    <div className="screen">
      <PageHeader
        title={t("tonight.title")}
        subtitle={
          routineLevel !== null ? (
            <>
              {t("tonight.routineLevel")} {routineLevel}
            </>
          ) : undefined
        }
      />

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {steps.length === 0 && <p className="muted">{t("tonight.loadingPlan")}</p>}
        {steps.map((step) => (
          <div key={step.stepCode} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
              <span>
                {stepLabel(step)}
                {step.mode && (
                  <span
                    className="muted"
                    style={{ marginLeft: "0.5rem", fontSize: "0.7rem", border: "1px solid var(--color-border)", borderRadius: "999px", padding: "0.05rem 0.5rem" }}
                  >
                    {t(`mode.${step.mode}`)}
                  </span>
                )}
                {step.stepCode === "PRODUCT" && !!step.protocolSteps?.length && (
                  <button
                    onClick={() => setOpenProtocol((v) => !v)}
                    style={{ marginLeft: "0.5rem", background: "none", border: "none", padding: 0, textDecoration: "underline", fontSize: "0.8rem", color: "var(--color-primary)" }}
                  >
                    {openProtocol ? t("tonight.protocol.hide") : t("tonight.protocol.show")}
                  </button>
                )}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => mark(step, "DONE")} style={stepStatus[step.stepCode] === "DONE" ? { borderColor: "var(--color-primary)" } : {}}>
                  {t("tonight.done")}
                </button>
                <button onClick={() => mark(step, "SKIPPED")} style={stepStatus[step.stepCode] === "SKIPPED" ? { borderColor: "var(--color-danger)" } : {}}>
                  {t("tonight.skip")}
                </button>
              </div>
            </div>
            {step.stepCode === "PRODUCT" && openProtocol && !!step.protocolSteps?.length && (
              <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {step.protocolSteps.map((p, i) => (
                  <li key={i} style={{ fontSize: "0.85rem" }}>
                    <strong>{p.title}</strong> — <span className="muted">{p.instruction}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div>
          <p className="muted" style={{ margin: "0 0 0.4rem" }}>
            {t("tonight.trackLabel")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {SYNTH_TRACKS.map((track) => (
              <button
                key={track.code}
                onClick={() => chooseTrack(track.code)}
                style={trackCode === track.code ? { borderColor: "var(--color-primary)" } : {}}
              >
                {t(`tonight.track.${track.code}`)}
              </button>
            ))}
            {/* Music Library (29 Aug 2026) — Edmund's brief: let the user turn
                background music off entirely, not just switch tracks. */}
            <button onClick={() => chooseTrack("OFF")} style={trackCode === "OFF" ? { borderColor: "var(--color-primary)" } : {}}>
              🔇 {t("tonight.track.OFF")}
            </button>
          </div>
        </div>
        <div>
          <p className="muted" style={{ margin: "0 0 0.4rem" }}>
            {t("tonight.durationLabel")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {SLEEP_AUDIO_DURATION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setDurationLabel(preset.label)}
                style={durationLabel === preset.label ? { borderColor: "var(--color-primary)" } : {}}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="primary" onClick={startSleep}>
        {t("tonight.startSleep")}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
        <Link to="/review" className="muted">
          {t("tonight.review")}
        </Link>
        <Link to="/assessment" className="muted">
          {t("tonight.newQuestion")}
        </Link>
        <button onClick={logout}>{t("tonight.logout")}</button>
      </div>

      <BottomNav />
    </div>
  );
}
