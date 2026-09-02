import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t, getLocale } from "../i18n";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";
import { SYNTH_TRACKS, SLEEP_AUDIO_DURATION_PRESETS, WAKE_STYLES, type SynthTrackCode, type WakeStyle } from "@asclepios/shared";

interface ProtocolStep {
  title: string;
  instruction: string;
}

interface TonightStep {
  stepCode: string;
  stepInstanceId: string;
  actionInstanceId: string;
  productId?: string;
  productName?: string;
  mode?: "RHYTHM" | "CALM" | "BODY" | "SUPPORT";
  protocolSteps?: ProtocolStep[];
}

interface LibraryTrack {
  id: string;
  title: string;
  artist: string | null;
  audioUrl: string | null;
  artworkUrl: string | null;
}

// 31 Aug 2026 correction — a chosen audio is either one of the built-in
// synthesized tracks (SYNTH_TRACKS, played by SleepAudioEngine's Web Audio
// oscillators) or a real Music Library file (played by audio/musicPlayer.ts's
// <audio> element). Both end up as a plain sleepAudioId string on the
// SleepSession row — SleepPlayer.tsx tells them apart with isSynthTrack().
type ChosenAudio = { kind: "SYNTH"; code: SynthTrackCode } | { kind: "REAL"; id: string; title: string } | { kind: "OFF" };

type DurationMode = "FIXED" | "CUSTOM" | "UNTIL_WAKE" | "ALL_NIGHT";

function stepLabel(step: TonightStep): string {
  if (step.stepCode === "PRODUCT") return `${t("tonight.step.useProduct")} ${step.productName ?? ""}`.trim();
  if (step.stepCode === "BREATHING") return t("tonight.step.breathing");
  if (step.stepCode === "MUSIC") return t("tonight.step.music");
  return step.stepCode;
}

// HH:MM resolved to the next occurrence at or after a given reference
// instant (rolls to the next day if that clock-time has already passed
// relative to `after`).
function nextOccurrenceAfter(hhmm: string, after: Date): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(after);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= after.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

// Repair Plan A8 correction (2 Sep 2026, per audit) — nextOccurrence(bedtime)
// alone isn't enough: it's still anchored to "now", so pressing Start Sleep
// at 00:30 with the bedtime picker still showing "23:00" resolved to
// *tonight's* 23:00 — almost a full day away — not the session actually
// being started right now. Start Sleep is an explicit "I'm sleeping now"
// action, so if the configured bedtime's next occurrence is more than 4h
// away, the configured clock-time has already passed for this session;
// use "now" as the real target instead of rolling a day forward.
function resolveTargetSleepTime(bedtimeHHMM: string, now: Date): Date {
  const naive = nextOccurrenceAfter(bedtimeHHMM, now);
  const hoursAhead = (naive.getTime() - now.getTime()) / 3_600_000;
  return hoursAhead > 4 ? now : naive;
}

/**
 * Sleep Setting — 31 Aug 2026 correction (Edmund's "CRITICAL FUNCTIONAL
 * CORRECTION" list, points 3/4/5/7/8). Renamed from the old "Tonight's
 * Plan" framing: this is not a to-do list, it's the settings screen for
 * tonight's sleep session — target bedtime, wake alarm, and music are all
 * genuinely independent choices here, matching the SleepSession schema
 * (windDownStart/targetSleepTime/wakeTime/sleepAudioDurationMode were
 * already four separate fields server-side; this page previously only
 * ever used one of them — a hard-coded FIXED preset — leaving the other
 * three unreachable from the UI). The product/breathing checklist below
 * (Done/Skip, logged via /tonight/log-step) already existed and is kept
 * as-is.
 */
export default function Tonight() {
  const [steps, setSteps] = useState<TonightStep[]>([]);
  const [routineLevel, setRoutineLevel] = useState<number | null>(null);
  const [stepStatus, setStepStatus] = useState<Record<string, "DONE" | "SKIPPED">>({});
  const [chosenAudio, setChosenAudio] = useState<ChosenAudio>({ kind: "SYNTH", code: SYNTH_TRACKS[0].code });
  const [libraryTracks, setLibraryTracks] = useState<LibraryTrack[]>([]);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  const [durationMode, setDurationMode] = useState<DurationMode>("FIXED");
  const [presetLabel, setPresetLabel] = useState<string>("1 hr");
  const [customMinutes, setCustomMinutes] = useState<number>(40);

  const [bedtime, setBedtime] = useState<string>("22:30");
  const [wakeAlarmEnabled, setWakeAlarmEnabled] = useState(false);
  const [wakeTime, setWakeTime] = useState<string>("07:00");
  const [wakeStyle, setWakeStyle] = useState<WakeStyle>("NORMAL");

  const [openProtocolFor, setOpenProtocolFor] = useState<string | null>(null);
  const { user, logout, updateUser } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<{ steps: TonightStep[]; routineLevel: number }>(`/tonight?locale=${encodeURIComponent(getLocale())}`).then((r) => {
      setSteps(r.steps);
      setRoutineLevel(r.routineLevel);
    });
    // 31 Aug 2026 — real Music Library tracks are now selectable here too,
    // not just the built-in synthesized presets (correction point #4).
    api
      .get<{ tracks: LibraryTrack[] }>("/music/tracks")
      .then((r) => setLibraryTracks(r.tracks.filter((tr) => !!tr.audioUrl)))
      .catch(() => {});
  }, []);

  // Apply the persisted choice once (not on every user change) so picking a
  // different track this session doesn't get overwritten by a stale
  // /preferences response landing late.
  const appliedSavedTrack = useRef(false);
  useEffect(() => {
    if (appliedSavedTrack.current || !user) return;
    if (user.audioMuted) {
      setChosenAudio({ kind: "OFF" });
    } else if (user.preferredSleepAudioId) {
      const synthMatch = SYNTH_TRACKS.find((tr) => tr.code === user.preferredSleepAudioId);
      if (synthMatch) setChosenAudio({ kind: "SYNTH", code: synthMatch.code });
      // A real-track id can't be resolved to a title until libraryTracks has
      // loaded — a second small effect below handles that case.
    }
    appliedSavedTrack.current = true;
  }, [user]);

  useEffect(() => {
    if (!user || !user.preferredSleepAudioId || user.audioMuted) return;
    if (SYNTH_TRACKS.some((tr) => tr.code === user.preferredSleepAudioId)) return;
    const real = libraryTracks.find((tr) => tr.id === user.preferredSleepAudioId);
    if (real) setChosenAudio({ kind: "REAL", id: real.id, title: real.title });
  }, [user, libraryTracks]);

  function persistAudioChoice(next: ChosenAudio) {
    const preferredSleepAudioId = next.kind === "OFF" ? null : next.kind === "SYNTH" ? next.code : next.id;
    api
      .patch<{ preferredSleepAudioId: string | null; audioMuted: boolean }>("/preferences", {
        preferredSleepAudioId,
        audioMuted: next.kind === "OFF",
      })
      .then((res) => updateUser({ preferredSleepAudioId: res.preferredSleepAudioId, audioMuted: res.audioMuted }))
      .catch(() => {});
  }

  function chooseSynth(code: SynthTrackCode) {
    setChosenAudio({ kind: "SYNTH", code });
    persistAudioChoice({ kind: "SYNTH", code });
  }

  function chooseReal(tr: LibraryTrack) {
    setChosenAudio({ kind: "REAL", id: tr.id, title: tr.title });
    persistAudioChoice({ kind: "REAL", id: tr.id, title: tr.title });
    setShowLibraryPicker(false);
  }

  function chooseOff() {
    setChosenAudio({ kind: "OFF" });
    persistAudioChoice({ kind: "OFF" });
  }

  async function mark(step: TonightStep, status: "DONE" | "SKIPPED") {
    setStepStatus((s) => ({ ...s, [step.stepInstanceId]: status }));
    await api.post("/tonight/log-step", { stepCode: step.stepCode, status, productId: step.productId, actionInstanceId: step.actionInstanceId });
  }

  async function startSleep() {
    const targetSleepTime = resolveTargetSleepTime(bedtime, new Date());
    // A8 fix — wake time is resolved relative to bedtime, not "now", so it
    // can never land before or the wrong number of days from the session's
    // actual bedtime (see nextOccurrenceAfter's doc comment above).
    const wakeTimeDate = wakeAlarmEnabled ? nextOccurrenceAfter(wakeTime, targetSleepTime) : null;
    const sleepAudioId = chosenAudio.kind === "OFF" ? null : chosenAudio.kind === "SYNTH" ? chosenAudio.code : chosenAudio.id;

    const res = await api.post<{ session: any }>("/sleep-session/start", {
      targetSleepTime: targetSleepTime.toISOString(),
      wakeTime: wakeTimeDate ? wakeTimeDate.toISOString() : undefined,
      sleepAudioId,
      sleepAudioDurationMode: durationMode,
      presetLabel: durationMode === "FIXED" ? presetLabel : undefined,
      customSeconds: durationMode === "CUSTOM" ? customMinutes * 60 : undefined,
      wallpaperId: user?.wallpaperId ?? "WALL_MOON_LAKE_04",
      wakeStyle: wakeAlarmEnabled ? wakeStyle : "NORMAL",
      snoozeMinutes: 10,
      timezone: user?.timezone,
    });
    navigate(`/player/${res.session.id}`, { state: { session: res.session } });
  }

  const audioLabel =
    chosenAudio.kind === "OFF" ? t("tonight.track.OFF") : chosenAudio.kind === "SYNTH" ? t(`tonight.track.${chosenAudio.code}`) : chosenAudio.title;

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
          <div key={step.stepInstanceId} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
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
                    onClick={() => setOpenProtocolFor((v) => (v === step.stepInstanceId ? null : step.stepInstanceId))}
                    style={{ marginLeft: "0.5rem", background: "none", border: "none", padding: 0, textDecoration: "underline", fontSize: "0.8rem", color: "var(--color-primary)" }}
                  >
                    {openProtocolFor === step.stepInstanceId ? t("tonight.protocol.hide") : t("tonight.protocol.show")}
                  </button>
                )}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => mark(step, "DONE")} style={stepStatus[step.stepInstanceId] === "DONE" ? { borderColor: "var(--color-primary)" } : {}}>
                  {t("tonight.done")}
                </button>
                <button onClick={() => mark(step, "SKIPPED")} style={stepStatus[step.stepInstanceId] === "SKIPPED" ? { borderColor: "var(--color-danger)" } : {}}>
                  {t("tonight.skip")}
                </button>
              </div>
            </div>
            {step.stepCode === "PRODUCT" && openProtocolFor === step.stepInstanceId && !!step.protocolSteps?.length && (
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

      {/* Target bedtime — correction point #7/#8: a real, independent
          setting, not folded into the audio timer. */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <label htmlFor="bedtime" style={{ fontWeight: 600 }}>
          {t("tonight.bedtimeLabel")}
        </label>
        <input id="bedtime" type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} style={{ fontSize: "1.1rem", padding: "0.5rem" }} />
      </div>

      {/* Music — synth quick-picks (unchanged) + off, plus a Music Library
          browse option for real tracks (correction point #4). */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div>
          <p className="muted" style={{ margin: "0 0 0.4rem" }}>
            {t("tonight.trackLabel")}
          </p>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{audioLabel}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {SYNTH_TRACKS.map((track) => (
              <button
                key={track.code}
                onClick={() => chooseSynth(track.code)}
                style={chosenAudio.kind === "SYNTH" && chosenAudio.code === track.code ? { borderColor: "var(--color-primary)" } : {}}
              >
                {t(`tonight.track.${track.code}`)}
              </button>
            ))}
            <button onClick={chooseOff} style={chosenAudio.kind === "OFF" ? { borderColor: "var(--color-primary)" } : {}}>
              🔇 {t("tonight.track.OFF")}
            </button>
            <button onClick={() => setShowLibraryPicker((v) => !v)} className="primary">
              🎵 {t("tonight.browseLibrary")}
            </button>
          </div>
          {showLibraryPicker && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.6rem", maxHeight: "12rem", overflowY: "auto" }}>
              {libraryTracks.length === 0 && <p className="muted">{t("library.empty")}</p>}
              {libraryTracks.map((tr) => (
                <button
                  key={tr.id}
                  onClick={() => chooseReal(tr)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    textAlign: "left",
                    borderColor: chosenAudio.kind === "REAL" && chosenAudio.id === tr.id ? "var(--color-primary)" : undefined,
                  }}
                >
                  {tr.artworkUrl && <img src={tr.artworkUrl} alt="" aria-hidden="true" style={{ width: "2rem", height: "2rem", borderRadius: "6px", objectFit: "cover" }} />}
                  <span>{tr.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Duration — correction point #7/#8: presets from 5 min up to a
            genuinely open-ended "whole night" (Until Wake / All Night),
            plus a free-entry custom length — not capped at a short fixed
            list. Only shown when music isn't off. */}
        {chosenAudio.kind !== "OFF" && (
          <div>
            <p className="muted" style={{ margin: "0 0 0.4rem" }}>
              {t("tonight.durationLabel")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {SLEEP_AUDIO_DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setDurationMode("FIXED");
                    setPresetLabel(preset.label);
                  }}
                  style={durationMode === "FIXED" && presetLabel === preset.label ? { borderColor: "var(--color-primary)" } : {}}
                >
                  {preset.label}
                </button>
              ))}
              <button onClick={() => setDurationMode("UNTIL_WAKE")} style={durationMode === "UNTIL_WAKE" ? { borderColor: "var(--color-primary)" } : {}}>
                {t("tonight.durationUntilWake")}
              </button>
              <button onClick={() => setDurationMode("ALL_NIGHT")} style={durationMode === "ALL_NIGHT" ? { borderColor: "var(--color-primary)" } : {}}>
                {t("tonight.durationAllNight")}
              </button>
              <button onClick={() => setDurationMode("CUSTOM")} style={durationMode === "CUSTOM" ? { borderColor: "var(--color-primary)" } : {}}>
                {t("tonight.durationCustom")}
              </button>
            </div>
            {durationMode === "CUSTOM" && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  style={{ width: "5rem", padding: "0.5rem" }}
                />
                <span className="muted">{t("player.minutesSuffix")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Wake alarm — correction point #7: fully independent of the music
          duration, off by default. */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label htmlFor="wakeAlarmToggle" style={{ fontWeight: 600 }}>
            {t("tonight.wakeAlarmLabel")}
          </label>
          <button id="wakeAlarmToggle" onClick={() => setWakeAlarmEnabled((v) => !v)} className={wakeAlarmEnabled ? "primary" : undefined}>
            {wakeAlarmEnabled ? t("tonight.wakeAlarmOn") : t("tonight.wakeAlarmOff")}
          </button>
        </div>
        {wakeAlarmEnabled && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <label htmlFor="wakeTime">{t("tonight.wakeTimeLabel")}</label>
              <input id="wakeTime" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} style={{ fontSize: "1.1rem", padding: "0.5rem" }} />
            </div>
            <div>
              <p className="muted" style={{ margin: "0 0 0.4rem" }}>
                {t("tonight.wakeStyleLabel")}
              </p>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {WAKE_STYLES.map((style) => (
                  <button key={style} onClick={() => setWakeStyle(style)} style={wakeStyle === style ? { borderColor: "var(--color-primary)" } : {}}>
                    {t(`wakeStyle.${style}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
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
