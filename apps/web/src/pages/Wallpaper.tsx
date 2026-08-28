import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t } from "../i18n";

interface WallpaperOption {
  id: string;
  code: string;
  title: string;
  category: string;
  imageUrl: string | null;
  themeColor: string | null;
}

/**
 * Design moodboard 28 Aug 2026 — Wallpaper picker. Real photo assets don't
 * exist yet (Wallpaper.imageUrl is null for every seeded row), so each tile
 * renders as a colour-card using the wallpaper's own themeColor until real
 * images are uploaded via Admin — the picker itself is fully functional
 * either way. Reachable both as a setup step (/setup/wallpaper, chains into
 * the Theme Colour step) and from Settings (/wallpaper, saves immediately).
 */
export default function Wallpaper() {
  const [options, setOptions] = useState<WallpaperOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user, updateUser } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isSetup = location.pathname.startsWith("/setup");

  useEffect(() => {
    api.get<{ wallpapers: WallpaperOption[] }>("/wallpapers").then((r) => setOptions(r.wallpapers));
    setSelected(user?.wallpaperId ?? null);
  }, [user?.wallpaperId]);

  async function save(next: () => void) {
    if (!selected) return next();
    setSaving(true);
    try {
      const res = await api.patch<{ wallpaperId: string | null }>("/preferences", { wallpaperId: selected });
      updateUser({ wallpaperId: res.wallpaperId });
    } finally {
      setSaving(false);
      next();
    }
  }

  function continueSetup() {
    save(() => navigate("/setup/theme"));
  }

  function saveAndBack() {
    save(() => navigate("/settings"));
  }

  return (
    <div className="screen">
      <h1>{t(isSetup ? "setup.wallpaper.title" : "wallpaper.title")}</h1>
      {isSetup && <p className="muted">{t("setup.wallpaper.subtitle")}</p>}

      {options.length === 0 && <p className="muted">{t("setup.loading")}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {options.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelected(w.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.5rem",
              padding: "1rem",
              height: "6.5rem",
              borderRadius: "var(--radius)",
              border: selected === w.id ? "3px solid var(--color-primary)" : "1px solid var(--color-border)",
              background: w.imageUrl ? `center/cover url(${w.imageUrl})` : w.themeColor ?? "var(--color-surface)",
              color: "#fff",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
              width: "100%",
            }}
          >
            <strong>{w.title}</strong>
            <span style={{ fontSize: "0.8rem", opacity: 0.9 }}>{t(`wallpaper.category.${w.category}`)}</span>
          </button>
        ))}
      </div>

      {isSetup ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
          <button className="primary" onClick={continueSetup} disabled={saving}>
            {t("setup.continue")}
          </button>
          <button className="muted" onClick={() => navigate("/setup/theme")}>
            {t("setup.skip")}
          </button>
        </div>
      ) : (
        <button className="primary" onClick={saveAndBack} disabled={saving || !selected} style={{ marginTop: "auto" }}>
          {t("wallpaper.save")}
        </button>
      )}
    </div>
  );
}
