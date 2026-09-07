import { useEffect, useState } from "react";
import { api } from "../api/client";

export interface ActiveSleepSession {
  id: string;
  status: "ACTIVE" | "WOKEN";
}

// P0 continuity requirement (6 Sep 2026 owner directive) — several screens
// need to know about an in-progress sleep session: App's RootRedirect to
// resume it by default on cold entry instead of dropping the user on Home;
// Home/Tonight to offer a non-forced way back into it (and, on Tonight, to
// avoid starting a second session on top of one already running). One
// shared fetch avoids three copies of the same GET /sleep-session/active call.
export function useActiveSleepSession(enabled: boolean): { session: ActiveSleepSession | null; loaded: boolean } {
  const [session, setSession] = useState<ActiveSleepSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    api
      .get<{ session: ActiveSleepSession | null }>("/sleep-session/active")
      .then((r) => {
        if (!cancelled) setSession(r.session);
      })
      .catch(() => {
        /* best-effort — worst case, no resume affordance is offered this load */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { session, loaded };
}
