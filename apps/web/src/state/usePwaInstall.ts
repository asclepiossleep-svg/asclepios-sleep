import { useEffect, useState } from "react";

/**
 * PWA/Home Screen audit (6 Sep 2026) — the app had a manifest but nothing
 * ever surfaced an install affordance: Android's `beforeinstallprompt`
 * fired into the void (Chrome only shows its own mini-infobar, easy to
 * miss and dismiss by accident), and iOS Safari never fires that event at
 * all — "Add to Home Screen" is a Share-sheet action only we can explain,
 * not trigger. This hook is the single source of truth both native-banner
 * paths (see InstallPrompt.tsx) share.
 */
const DISMISS_KEY = "asclepios.pwaInstallDismissedAt";
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — reappear eventually, but don't nag every visit

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isDismissedRecently(): boolean {
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own non-standard flag — no matchMedia("display-mode") support.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(isDismissedRecently);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  const canShowAndroidPrompt = Boolean(deferredPrompt) && !installed && !dismissed;
  const canShowIosGuidance = isIos() && !installed && !dismissed;

  return { canShowAndroidPrompt, canShowIosGuidance, promptInstall, dismiss };
}
