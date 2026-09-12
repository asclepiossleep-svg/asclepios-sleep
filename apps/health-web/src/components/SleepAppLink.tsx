import type { ReactNode } from "react";
import { SLEEP_APP_URL } from "../config";
import { t } from "../i18n";

/**
 * Asclepios Sleep is a child destination reached by leaving this app
 * (separate Vercel deployment, apps/web — see issue #52). VITE_SLEEP_APP_URL
 * is a Vercel project environment variable set once the owner confirms the
 * live Sleep URL; until then this renders an honest disabled affordance
 * instead of a guessed link.
 */
export default function SleepAppLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  if (!SLEEP_APP_URL) {
    return (
      <span className={className} title={t("health.sleepAppPending")} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <a className={className} href={SLEEP_APP_URL} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
