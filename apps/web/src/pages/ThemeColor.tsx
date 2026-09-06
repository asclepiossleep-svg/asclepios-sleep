import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t } from "../i18n";
import { THEME_COLORS } from "@asclepios/shared";
import PageHeader from "../components/PageHeader";

/**
 * Design moodboard 28 Aug 2026 — Theme Colour picker. Six presets, centrally
 * defined in packages/shared so this list never drifts from the design spec
 * (Doc 01 §5). Reachable as the last setup step (/setup/theme, finishes
 * setup -> Home) and from Settings (/theme, saves immediately).
 */
export default function ThemeColor() {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { user, updateUser } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isSetup = location.pathname.startsWith("/setup");

  useEffect(() => {
    setSelected(user?.themeColor ?? null);
  }, [user?.themeColor]);

  async function save(next: () => void) {
    if (!selected) return next();
    setSaving(true);
    setSaveError(false);
    try {
      const res = await api.patch<{ themeColor: string | null }>("/preferences", { themeColor: selected });
      updateUser({ themeColor: res.themeColor });
      next();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  function finishSetup() {
    save(() => navigate("/home"));
  }

  function saveAndBack() {
    save(() => navigate("/settings"));
  }

  return (
    <div className="screen">
      <PageHeader
        title={t(isSetup ? "setup.theme.title" : "theme.title")}
        subtitle={isSetup ? t("setup.theme.subtitle") : undefined}
        backTo={isSetup ? undefined : "/settings"}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        {THEME_COLORS.map((c) => (
          <button
            key={c.code}
            onClick={() => setSelected(c.hex)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1rem 0.5rem",
              borderRadius: "var(--radius)",
              border: selected === c.hex ? "3px solid var(--color-text)" : "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <span style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: c.hex, display: "block" }} />
            <span style={{ fontSize: "0.8rem" }}>{t(`theme.color.${c.code}`)}</span>
          </button>
        ))}
      </div>

      {saveError && <p style={{ color: "var(--color-danger)" }}>{t("theme.saveError")}</p>}

      {isSetup ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
          <button className="primary" onClick={finishSetup} disabled={saving}>
            {t("setup.continue")}
          </button>
          <button className="muted" onClick={() => navigate("/home")}>
            {t("setup.skip")}
          </button>
        </div>
      ) : (
        <button className="primary" onClick={saveAndBack} disabled={saving || !selected} style={{ marginTop: "auto" }}>
          {t("theme.save")}
        </button>
      )}
    </div>
  );
}
