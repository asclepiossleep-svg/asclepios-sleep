import { useSyncExternalStore } from "react";
import { getLocale, subscribeLocale } from "./index";

export function useLocale(): string {
  return useSyncExternalStore(subscribeLocale, getLocale);
}
