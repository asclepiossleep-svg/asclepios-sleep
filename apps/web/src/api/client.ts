// In production there is no same-origin "/api" to proxy to — apps/web and
// apps/api are two separate Vercel projects/domains. Local dev keeps using
// the Vite dev-server proxy (see vite.config.ts) via the relative "/api"
// path; VITE_API_URL can override either default if ever needed (e.g. a
// staging API).
const BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "https://asclepios-sleep-api.vercel.app" : "/api");

function getToken(): string | null {
  return sessionState.token;
}

// In-memory only — a real build should persist via a secure httpOnly
// pattern or a wrapped storage layer; kept simple here for the scaffold.
export const sessionState: { token: string | null } = { token: null };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
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
