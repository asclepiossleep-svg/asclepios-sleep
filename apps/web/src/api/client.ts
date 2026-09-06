// In production there is no same-origin "/api" to proxy to — apps/web and
// apps/api are two separate Vercel projects/domains. Local dev keeps using
// the Vite dev-server proxy (see vite.config.ts) via the relative "/api"
// path; VITE_API_URL can override either default if ever needed (e.g. a
// staging API).
const BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "https://asclepios-sleep-api.vercel.app" : "/api");

const TOKEN_STORAGE_KEY = "asclepios.session.token";

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Private browsing / storage blocked — fall back to in-memory only,
    // same behaviour as before this fix.
    return null;
  }
}

function getToken(): string | null {
  return sessionState.token;
}

/**
 * 31 Aug 2026 fix — token now also persists to localStorage, so a page
 * refresh (or reopening the tab) doesn't silently log the user out back to
 * Welcome. sessionState.token stays the single in-memory source of truth
 * that the rest of the app reads every request; localStorage is just the
 * durable copy used to restore it on load (see SessionProvider's mount
 * effect in state/session.tsx, which calls setSessionToken then re-fetches
 * the user via GET /auth/session).
 */
export const sessionState: { token: string | null } = { token: readStoredToken() };

export function setSessionToken(token: string | null) {
  sessionState.token = token;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage blocked — session still works for this tab via sessionState,
    // it just won't survive a reload. Not worth surfacing to the user.
  }
}

// Auth persistence audit (5 Sep 2026) — event name the app listens for to
// force a clean logout (see state/session.tsx). A plain window event, not a
// callback registered here, so this module doesn't need to import/depend on
// SessionProvider.
export const SESSION_EXPIRED_EVENT = "asclepios:session-expired";

// Timezone Auto/Manual (6 Sep 2026) — sent on every request so an explicit
// PATCH /preferences switching to Auto (see Settings.tsx) can resolve the
// device's zone immediately in that same request, and so requireAuth has it
// available whenever a sync is actually due (see the sync flag below).
// Reading this fresh per-request (not once at module load) is what makes it
// reflect an actual timezone change without a full app reload.
function currentDeviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

// Timezone Auto/Manual audit correction (6 Sep 2026) — the API used to sync
// an Auto-mode user's timezone on *every* authenticated request, which was
// an unconditional DB write on the app's hot path and undefined for two
// devices in different zones (whichever device's request landed last would
// silently move the account's shared night boundary). Auto-follow now only
// fires at a bounded "app open/resume" point: this flag starts true (first
// request after a fresh load/reopen) and is set again whenever the tab
// regains visibility after being hidden — not on routine API traffic in
// between. It's consumed (cleared) by the very next request that reads it.
let pendingTimezoneSync = true;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pendingTimezoneSync = true;
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const deviceTimeZone = currentDeviceTimeZone();
  const shouldSyncTimezone = pendingTimezoneSync;
  pendingTimezoneSync = false;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(deviceTimeZone ? { "X-Client-Timezone": deviceTimeZone } : {}),
      ...(shouldSyncTimezone ? { "X-Client-Timezone-Sync": "1" } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Only a 401 on a request that actually carried a session token means
    // "this session is no longer valid" (expired/invalid/revoked) — a 401
    // from e.g. /auth/password/login with a wrong password never sends a
    // token and must not be treated as "log the (already logged-out) user
    // out". Previously nothing handled this case at all: a token going bad
    // mid-session (e.g. a revoked device) just surfaced as a generic thrown
    // error to whichever component happened to be calling.
    if (res.status === 401 && token) {
      setSessionToken(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new Error(body.error ?? `request_failed_${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
