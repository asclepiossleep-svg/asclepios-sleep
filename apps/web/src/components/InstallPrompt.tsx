import { usePwaInstall } from "../state/usePwaInstall";
import { t } from "../i18n";

/**
 * PWA/Home Screen audit (6 Sep 2026) — surfaces the two real install paths:
 * Android/Chrome's native `beforeinstallprompt` (one tap, this component
 * just triggers it) and iOS Safari's Share -> Add to Home Screen, which no
 * API can trigger, only explain. Rendered once, high in the tree (App.tsx,
 * same placement as MusicPlayerBar/AppBackground) so it survives
 * navigation; `usePwaInstall` owns the "don't nag" cooldown so this stays a
 * pure render of whatever that hook decides.
 */
export default function InstallPrompt() {
  const { canShowAndroidPrompt, canShowIosGuidance, promptInstall, dismiss } = usePwaInstall();
  if (!canShowAndroidPrompt && !canShowIosGuidance) return null;

  return (
    <div
      role="region"
      aria-label={t("pwaInstall.label")}
      style={{
        position: "fixed",
        top: "env(safe-area-inset-top, 0px)",
        left: "0.75rem",
        right: "0.75rem",
        zIndex: 20,
        marginTop: "0.75rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        borderRadius: "var(--radius)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: "0.95rem" }}>{t("pwaInstall.title")}</strong>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {canShowAndroidPrompt ? t("pwaInstall.bodyAndroid") : t("pwaInstall.bodyIos")}
        </span>
      </div>
      {canShowAndroidPrompt && (
        <button
          onClick={promptInstall}
          className="primary"
          style={{ minHeight: "var(--touch-target-min)", padding: "0 1rem", flexShrink: 0 }}
        >
          {t("pwaInstall.install")}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label={t("pwaInstall.dismiss")}
        style={{
          minWidth: "var(--touch-target-min)",
          minHeight: "var(--touch-target-min)",
          flexShrink: 0,
          background: "none",
          border: "none",
          fontSize: "1.2rem",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
