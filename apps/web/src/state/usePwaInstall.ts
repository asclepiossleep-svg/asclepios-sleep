import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PwaPlatform = "ios" | "android" | "other";

function detectPlatform(): PwaPlatform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function detectStandalone(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari's own pre-standard flag, never added to the DOM lib types.
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

/**
 * PWA install/Home Screen flow (6 Sep 2026). Chrome/Android fire
 * `beforeinstallprompt` once and only replay their native install UI if the
 * event is captured and `prompt()` is called on it later — calling
 * `preventDefault()` here is what lets install live inside our own "Install"
 * button instead of an unpredictable browser-chosen moment. iOS Safari never
 * fires this event and has no programmatic install API at all; the only
 * affordance there is the Share -> Add to Home Screen guidance text, gated
 * on `platform === "ios" && !isStandalone`.
 */
export function usePwaInstall() {
  const [platform] = useState(detectPlatform);
  const [isStandalone, setIsStandalone] = useState(detectStandalone);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Accepted or dismissed, the browser won't reuse this same captured
    // event again — a future install attempt needs a fresh beforeinstallprompt.
    setDeferredPrompt(null);
  }

  return {
    platform,
    isStandalone,
    canPromptInstall: deferredPrompt !== null,
    showIosGuidance: platform === "ios" && !isStandalone,
    promptInstall,
  };
}
