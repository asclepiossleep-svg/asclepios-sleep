/**
 * Asclepios Sleep is deployed as its own Vercel project (apps/web), separate
 * from this Health project (apps/health-web) — see issue #52. This URL is
 * not known/confirmed in the repo, so it must be set as a Vercel project
 * environment variable once the Sleep deployment's real URL is confirmed;
 * it is intentionally left unset here rather than guessed.
 */
export const SLEEP_APP_URL = import.meta.env.VITE_SLEEP_APP_URL ?? "";
