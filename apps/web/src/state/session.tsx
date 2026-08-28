import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api, sessionState } from "../api/client";
import { setLocale } from "../i18n";

interface SessionUser {
  id: string;
  email: string;
  role: string;
  locale: string;
  timezone: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  entitlements: string[];
  loading: boolean;
  setToken: (token: string, user: SessionUser) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No persisted-storage auto-login in this scaffold — every reload
    // re-enters Welcome. Wiring a refresh-token flow is a Doc 06 build-order
    // item, not required for the vertical slice.
    setLoading(false);
  }, []);

  function setToken(token: string, nextUser: SessionUser) {
    sessionState.token = token;
    setUser(nextUser);
    setLocale(nextUser.locale);
    api.get<{ entitlements: string[] }>("/auth/session").then((s) => setEntitlements(s.entitlements));
  }

  function logout() {
    sessionState.token = null;
    setUser(null);
    setEntitlements([]);
  }

  return <SessionContext.Provider value={{ user, entitlements, loading, setToken, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
