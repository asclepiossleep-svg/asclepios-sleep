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

type DurationChoice = { kind: "FIXED"; label: string; seconds: number } | { kind: "UNTIL_WAKE" } | { kind: "ALL_NIGHT" };

// Fix #5.2 (2 Sep 2026) — the wheel picker's single source of items: every
// FIXED preset plus the two open-ended modes, in display order. Custom is
// deliberately NOT in this list — it's a secondary "Custom…" link below
// the wheel, not another item to swipe past (per Edmund's brief).
const DURATION_CHOICES: DurationChoice[] = [
  ...SLEEP_AUDIO_DURATION_PRESETS.map((p) => ({ kind: "FIXED" as const, label: p.label, seconds: p.seconds })),
  { kind: "UNTIL_WAKE" },
  { kind: "ALL_NIGHT" },
];

function durationChoiceLabel(choice: DurationChoice): string {
  if (choice.kind === "FIXED") return choice.label;
  if (choice.kind === "UNTIL_WAKE") return t("tonight.durationUntilWake");
  return t("tonight.durationAllNight");
}

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

  const [durationMode, setDurationMode] = useState<DurationMode>("FIXED");
  const [presetLabel, setPresetLabel] = useState<string>("1 hr");
  const [customMinutes, setCustomMinutes] = useState<number>(40);
  const durationScrollRef = useRef<HTMLDivElement>(null);
  const durationScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function chooseOff() {
    setChosenAudio({ kind: "OFF" });
    persistAudioChoice({ kind: "OFF" });
  }

  // Fix #5.2 (2 Sep 2026) — replaces the old wall of duration buttons with
  // a horizontal, scroll-snap "wheel" (5m/10m/.../3h/Until Wake/All Night).
  // DURATION_ITEM_WIDTH/GAP are real layout constants, not arbitrary —
  // the container's side padding is set to exactly (100% - item width)/2
  // in the JSX below so that item i sits centered when
  // scrollLeft === i * (width + gap). That symmetry is what makes swipe
  // detection below a one-line calculation instead of a size-measuring
  // exercise.
  const DURATION_ITEM_WIDTH = 84;
  const DURATION_ITEM_GAP = 10;
  const DURATION_STEP = DURATION_ITEM_WIDTH + DURATION_ITEM_GAP;

  function selectedDurationIndex(): number {
    if (durationMode === "UNTIL_WAKE") return DURATION_CHOICES.findIndex((c) => c.kind === "UNTIL_WAKE");
    if (durationMode === "ALL_NIGHT") return DURATION_CHOICES.findIndex((c) => c.kind === "ALL_NIGHT");
    if (durationMode === "FIXED") return DURATION_CHOICES.findIndex((c) => c.kind === "FIXED" && c.label === presetLabel);
    return -1; // CUSTOM — no wheel item is "the" selection while custom is active
  }

  function applyDurationChoice(choice: DurationChoice) {
    if (choice.kind === "FIXED") {
      setDurationMode("FIXED");
      setPresetLabel(choice.label);
    } else {
      setDurationMode(choice.kind);
    }
  }

  // Tap-to-select — always works regardless of touch/swipe support, and is
  // a real keyboard fallback since these are plain <button> elements
  // (Enter/Space activate onClick natively).
  function tapDuration(choice: DurationChoice, index: number) {
    applyDurationChoice(choice);
    durationScrollRef.current?.children[index]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  // Swipe-to-select — after scrolling stops (150ms of no scroll events),
  // whichever item is nearest the container's center becomes the
  // selection. Debounced so this runs once per swipe, not on every frame.
  function onDurationScroll() {
    if (durationScrollTimeout.current) clearTimeout(durationScrollTimeout.current);
    durationScrollTimeout.current = setTimeout(() => {
      const container = durationScrollRef.current;
      if (!container) return;
      const index = Math.max(0, Math.min(DURATION_CHOICES.length - 1, Math.round(container.scrollLeft / DURATION_STEP)));
      applyDurationChoice(DURATION_CHOICES[index]);
    }, 150);
  }

  useEffect(() => {
    const index = selectedDurationIndex();
    const el = durationScrollRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Music — Fix #5.1 (2 Sep 2026): a single entry point into Music
          Library (real tracks + synthesized ambience together), not a
          duplicated row of quick-pick buttons here too. */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div>
          <p className="muted" style={{ margin: "0 0 0.4rem" }}>
            {t("tonight.trackLabel")}
          </p>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{audioLabel}</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link to="/music?selectFor=tonight" className="primary" style={{ textDecoration: "none" }}>
              🎵 {t("tonight.chooseMusic")}
            </Link>
            <button onClick={chooseOff} style={chosenAudio.kind === "OFF" ? { borderColor: "var(--color-primary)" } : {}}>
              🔇 {t("tonight.track.OFF")}
            </button>
          </div>
        </div>

        {/* Duration — Fix #5.2 (2 Sep 2026): a scroll-snap "wheel" instead
            of a wrapped grid of buttons. Presets from 5 min up to a
            genuinely open-ended "whole night" (Until Wake / All Night)
            are swipeable in one row; Custom is a secondary link below,
            not another item to swipe past. Only shown when music isn't
            off. */}
        {chosenAudio.kind !== "OFF" && (
          <div>
            <p className="muted" style={{ margin: "0 0 0.4rem" }}>
              {t("tonight.durationLabel")}
            </p>
            <div
              ref={durationScrollRef}
              onScroll={onDurationScroll}
              role="listbox"
              aria-label={t("tonight.durationLabel")}
              style={{
                display: "flex",
                gap: `${DURATION_ITEM_GAP}px`,
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                padding: `0.4rem calc(50% - ${DURATION_ITEM_WIDTH / 2}px)`,
                marginLeft: "-1rem",
                marginRight: "-1rem",
              }}
            >
              {DURATION_CHOICES.map((choice, index) => {
                const isSelected = durationMode !== "CUSTOM" && index === selectedDurationIndex();
                return (
                  <button
                    key={durationChoiceLabel(choice) + index}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => tapDuration(choice, index)}
                    style={{
                      flex: `0 0 ${DURATION_ITEM_WIDTH}px`,
                      scrollSnapAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: "0.75rem 0.3rem",
                      borderRadius: "999px",
                      fontSize: isSelected ? "1rem" : "0.85rem",
                      fontWeight: isSelected ? 700 : 400,
                      opacity: isSelected ? 1 : 0.6,
                      transform: isSelected ? "scale(1.08)" : "scale(1)",
                      transition: "transform 0.15s, opacity 0.15s, font-size 0.15s",
                      borderColor: isSelected ? "var(--color-primary)" : undefined,
                    }}
                  >
                    {durationChoiceLabel(choice)}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setDurationMode((m) => (m === "CUSTOM" ? "FIXED" : "CUSTOM"))}
              className="muted"
              style={{ background: "none", border: "none", textDecoration: "underline", fontSize: "0.8rem", marginTop: "0.4rem", padding: 0 }}
            >
              {durationMode === "CUSTOM" ? t("tonight.durationCustomHide") : t("tonight.durationCustomShow")}
            </button>
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
