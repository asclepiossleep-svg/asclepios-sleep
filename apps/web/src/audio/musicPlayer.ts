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
}

const audio = typeof Audio !== "undefined" ? new Audio() : null;
if (audio) {
  audio.loop = true;
  audio.preload = "none";
}

let state: PlayerState = { track: null, playing: false };
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

if (audio && "mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => resume());
  navigator.mediaSession.setActionHandler("pause", () => pause());
  navigator.mediaSession.setActionHandler("stop", () => stop());
}

export function playTrack(track: PlayableTrack) {
  if (!audio) return;
  const isSameTrack = state.track?.id === track.id;
  state = { track, playing: true };
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
  state = { track: null, playing: false };
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

export function getState(): PlayerState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
