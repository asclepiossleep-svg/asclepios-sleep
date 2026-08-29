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
