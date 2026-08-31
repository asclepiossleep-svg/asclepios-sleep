/**
 * Music Library V1 — Phase 3 (31 Aug 2026), Edmund's brief: "a new function
 * they can choice to play choiced song, play only, no need when sleeping,
 * repeat until stop, and even screen off still playing until stop."
 *
 * This is a module-level singleton, not a React component — it must
 * survive page navigation (React Router unmounts/remounts pages all the
 * time), so a single real HTMLAudioElement lives here for the app's whole
 * lifetime, created once and reused. React components subscribe via
 * `subscribe()`/`getState()` (see state/useMusicPlayer.ts) rather than
 * owning the element themselves.
 *
 * `loop = true` on the element handles "repeat until stop" natively — no
 * manual restart-on-end logic needed.
 *
 * Background/screen-off playback: this uses a real <audio> element (not
 * the Web Audio API oscillators SleepAudioEngine uses for synthesized
 * tracks), which is what lets mobile OSes treat it as ongoing media
 * playback. `navigator.mediaSession` metadata + action handlers are set
 * whenever available so a locked screen shows track info and play/pause/
 * stop controls. Honesty about the ceiling here: Android Chrome and a
 * home-screen-installed iOS PWA handle this well; a plain (non-installed)
 * iOS Safari tab is more likely to pause when the screen locks — that's an
 * iOS platform limitation, not something fixable from web code alone.
 *
 * 31 Aug 2026 fix — added currentTime/duration/volume so a full-screen
 * "now playing" view (design moodboard's Sleep Player screen, adapted for
 * Music Library — see pages/NowPlaying.tsx) can show a real seekable
 * progress bar and volume control instead of just play/pause/stop.
 */
export interface PlayableTrack {
  id: string;
  title: string;
  artist?: string | null;
  audioUrl: string;
  artworkUrl?: string | null;
}

interface PlayerState {
  track: PlayableTrack | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

const audio = typeof Audio !== "undefined" ? new Audio() : null;
if (audio) {
  audio.loop = true;
  audio.preload = "none";
  audio.volume = 0.85;
}

let state: PlayerState = { track: null, playing: false, currentTime: 0, duration: 0, volume: 0.85 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function updateMediaSession() {
  if (!("mediaSession" in navigator) || !state.track) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.track.title,
      artist: state.track.artist ?? "Asclepios Sleep",
      artwork: state.track.artworkUrl ? [{ src: state.track.artworkUrl, sizes: "512x512", type: "image/webp" }] : [],
    });
    navigator.mediaSession.playbackState = state.playing ? "playing" : "paused";
  } catch {
    // Older browsers without MediaMetadata support — playback itself still works.
  }
}

if (audio) {
  audio.addEventListener("timeupdate", () => {
    state = { ...state, currentTime: audio.currentTime };
    emit();
  });
  audio.addEventListener("loadedmetadata", () => {
    state = { ...state, duration: Number.isFinite(audio.duration) ? audio.duration : 0 };
    emit();
  });
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => resume());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("stop", () => stop());
  }
}

export function playTrack(track: PlayableTrack) {
  if (!audio) return;
  const isSameTrack = state.track?.id === track.id;
  state = { ...state, track, playing: true, currentTime: isSameTrack ? state.currentTime : 0, duration: isSameTrack ? state.duration : 0 };
  if (!isSameTrack) {
    audio.src = track.audioUrl;
  }
  audio.play().catch(() => {
    // Autoplay can be blocked until a user gesture — the UI's own play
    // button click is a user gesture, so this normally succeeds; failures
    // here are rare (e.g. a bad audioUrl) and just leave playing:false.
    state = { ...state, playing: false };
    emit();
  });
  updateMediaSession();
  emit();
}

export function pause() {
  if (!audio) return;
  audio.pause();
  state = { ...state, playing: false };
  updateMediaSession();
  emit();
}

export function resume() {
  if (!audio || !state.track) return;
  audio.play().catch(() => {});
  state = { ...state, playing: true };
  updateMediaSession();
  emit();
}

export function stop() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  state = { track: null, playing: false, currentTime: 0, duration: 0, volume: state.volume };
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch {
      /* no-op */
    }
  }
  emit();
}

export function seek(seconds: number) {
  if (!audio || !state.track) return;
  audio.currentTime = Math.max(0, Math.min(seconds, state.duration || seconds));
  state = { ...state, currentTime: audio.currentTime };
  emit();
}

export function setVolume(v: number) {
  if (!audio) return;
  const clamped = Math.max(0, Math.min(1, v));
  audio.volume = clamped;
  state = { ...state, volume: clamped };
  emit();
}

let fadeInterval: ReturnType<typeof setInterval> | null = null;

// 31 Aug 2026 — Sleep Setting correction: a Music Library track picked as
// tonight's sleep sound needs the same "fade out near the end, don't just
// cut off" behaviour SleepAudioEngine already gives synthesized tracks
// (see SleepPlayer.tsx). A plain <audio> element has no Web-Audio-style
// gain ramp, so this steps `audio.volume` down in small increments instead
// — coarser than a true linear ramp but inaudible as a stepped effect at
// normal fade lengths (60s+), then stops and restores the saved volume for
// next time.
export function fadeOutAndStop(seconds: number) {
  if (!audio || !state.track) return;
  if (fadeInterval) clearInterval(fadeInterval);
  const startVolume = audio.volume;
  const steps = 30;
  const stepMs = Math.max(50, (seconds * 1000) / steps);
  let i = 0;
  fadeInterval = setInterval(() => {
    i++;
    audio.volume = Math.max(0, startVolume * (1 - i / steps));
    if (i >= steps) {
      if (fadeInterval) clearInterval(fadeInterval);
      fadeInterval = null;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = startVolume;
      state = { track: null, playing: false, currentTime: 0, duration: 0, volume: startVolume };
      emit();
    }
  }, stepMs);
}

export function getState(): PlayerState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
