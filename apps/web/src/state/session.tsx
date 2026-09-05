import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api, sessionState, setSessionToken, SESSION_EXPIRED_EVENT } from "../api/client";
import { setLocale } from "../i18n";

interface SessionWallpaper {
  imageUrl: string | null;
  themeColor: string | null;
}

interface SessionUser {
  id: string;
  email: string;
  role: string;
  locale: string;
  timezone: string;
  // 31 Aug 2026 — Edmund's feedback: greet people by their actual name, not
  // their email prefix. Set on Register (Login.tsx) or later from Settings;
  // null/undefined for anyone who hasn't set one yet.
  displayName?: string | null;
  wallpaperId?: string | null;
  themeColor?: string | null;
  // App-wide wallpaper (29 Aug 2026) — the full Wallpaper row (imageUrl in
  // particular), not just its id, so AppBackground can render the photo
  // without every page re-fetching /preferences. Populated on login and
  // refreshed whenever Wallpaper.tsx saves a new pick.
  wallpaper?: SessionWallpaper | null;
  // Music Library (29 Aug 2026) — persisted "change/turn off background
  // music" choice, same populate-on-login + refresh-on-save pattern as
  // wallpaper above.
  preferredSleepAudioId?: string | null;
  audioMuted?: boolean;
}

interface SessionContextValue {
  user: SessionUser | null;
  entitlements: string[];
  loading: boolean;
  setToken: (token: string, user: SessionUser) => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  function loadPreferences() {
    api
      .get<{ displayName: string | null; wallpaper: SessionWallpaper | null; preferredSleepAudioId: string | null; audioMuted: boolean }>("/preferences")
      .then((p) =>
        setUser((prev) =>
          prev ? { ...prev, displayName: p.displayName, wallpaper: p.wallpaper, preferredSleepAudioId: p.preferredSleepAudioId, audioMuted: p.audioMuted } : prev
        )
      )
      .catch(() => {});
  }

  useEffect(() => {
    // 31 Aug 2026 fix — a token saved in localStorage from a previous visit
    // (see api/client.ts) means we can restore the session instead of
    // dropping straight back to Welcome on every reload. GET /auth/session
    // both validates the token is still good and gives us the current user
    // in one call; an expired/invalid token just clears it and falls
    // through to the normal logged-out state.
    if (!sessionState.token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: SessionUser; entitlements: string[] }>("/auth/session")
      .then((s) => {
        setUser(s.user);
        setEntitlements(s.entitlements);
        setLocale(s.user.locale);
        loadPreferences();
      })
      .catch(() => {
        setSessionToken(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth persistence audit (5 Sep 2026) — client.ts dispatches this when any
  // authenticated request comes back 401 (token expired/invalid, or its
  // device was revoked from another session). Previously only the initial
  // page-load session check could ever clear a bad token; a token going bad
  // mid-session left the app half-authenticated with silently-failing calls
  // instead of cleanly returning to /login.
  useEffect(() => {
    function handleExpired() {
      setUser(null);
      setEntitlements([]);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  function setToken(token: string, nextUser: SessionUser) {
    setSessionToken(token);
    setUser(nextUser);
    setLocale(nextUser.locale);
    api.get<{ entitlements: string[] }>("/auth/session").then((s) => setEntitlements(s.entitlements));
    // App-wide wallpaper (29 Aug 2026) — /auth/otp/verify and /demo/login
    // don't return the full Wallpaper row (just wallpaperId), so fetch it
    // once here; AppBackground reads user.wallpaper.imageUrl from then on.
    // Music Library (29 Aug 2026) — same round trip also carries the
    // persisted background-music choice.
    loadPreferences();
  }

  function updateUser(patch: Partial<SessionUser>) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function logout() {
    setSessionToken(null);
    setUser(null);
    setEntitlements([]);
  }

  return <SessionContext.Provider value={{ user, entitlements, loading, setToken, updateUser, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
