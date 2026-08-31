import { useSyncExternalStore } from "react";
import { getState, subscribe } from "../audio/musicPlayer";

export function useMusicPlayer() {
  return useSyncExternalStore(subscribe, getState, getState);
}
