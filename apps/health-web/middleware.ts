// Vercel Routing Middleware for apps/health-web. Runs on every deployed
// request matching `config.matcher` below (production and preview) before
// the SPA catch-all rewrite in vercel.json would otherwise serve
// index.html. Not used by local dev/`vite preview`/CI browser-smoke, which
// talk to a local server directly and never pass through this file — see
// tests/health-browser-smoke.mjs and .github/workflows/browser-smoke-gate.yml.
//
// The Owner Operations Console (`/internal/*`) is an internal-only demo
// surface and must never be reachable by an unauthenticated visitor on a
// public Vercel URL. There is no backend/session system in this static app,
// so the smallest correct control available at this layer is HTTP Basic
// Auth, gated on operator-supplied Vercel environment variables. No
// credential value is invented or committed here: until an operator sets
// both OPS_CONSOLE_BASIC_AUTH_USER and OPS_CONSOLE_BASIC_AUTH_PASSWORD in
// the Vercel project, the route fails closed (404) rather than open.
export const config = {
  matcher: "/internal/:path*",
};

// Allowing the request through means serving the same SPA shell that
// vercel.json's `/(.*) -> /index.html` rewrite would otherwise have served
// for this path — a plain, directly verifiable fetch of that static asset,
// rather than relying on an undocumented inter-process "continue" signal
// that would require an additional dependency to replicate correctly.
function allow(request: Request): Promise<Response> {
  return fetch(new URL("/index.html", request.url));
}

function unauthorized(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Owner Operations Console", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export default async function middleware(request: Request): Promise<Response> {
  // Belt-and-suspenders: enforce the gate in code too, independent of
  // whether this platform's matcher routing is honoured for a non-Next
  // project, so a routing gap can never turn this into a site-wide lockout.
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/internal/")) {
    return allow(request);
  }

  const expectedUser = process.env.OPS_CONSOLE_BASIC_AUTH_USER;
  const expectedPassword = process.env.OPS_CONSOLE_BASIC_AUTH_PASSWORD;

  // No credentials configured for this deployment: do not expose the
  // internal console at all, in production or preview.
  if (!expectedUser || !expectedPassword) {
    return notFound();
  }

  const authHeader = request.headers.get("authorization") || "";
  const [scheme, encoded] = authHeader.split(" ");
  if (scheme !== "Basic" || !encoded) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    return unauthorized();
  }

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (user !== expectedUser || password !== expectedPassword) {
    return unauthorized();
  }

  return allow(request);
}
