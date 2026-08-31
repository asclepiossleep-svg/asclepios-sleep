import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api, sessionState, setSessionToken } from "../api/client";
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
  wallpaperId?: string | null;
  themeColor?: string | null;
  wallpaper?: SessionWallpaper | null;
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
      .get<{ wallpaper: SessionWallpaper | null; preferredSleepAudioId: string | null; audioMuted: boolean }>("/preferences")
      .then((p) =>
        setUser((prev) => (prev ? { ...prev, wallpaper: p.wallpaper, preferredSleepAudioId: p.preferredSleepAudioId, audioMuted: p.audioMuted } : prev))
      )
      .catch(() => {});
  }

  useEffect(() => {
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

  function setToken(token: string, nextUser: SessionUser) {
    setSessionToken(token);
    setUser(nextUser);
    setLocale(nextUser.locale);
    api.get<{ entitlements: string[] }>("/auth/session").then((s) => setEntitlements(s.entitlements));
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
