import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t } from "../i18n";
import PageHeader from "../components/PageHeader";
import { WALLPAPER_CATEGORIES } from "@asclepios/shared";

interface WallpaperOption {
  id: string;
  code: string;
  title: string;
  category: string;
  imageUrl: string | null;
  themeColor: string | null;
}

export default function Wallpaper() {
  const [options, setOptions] = useState<WallpaperOption[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user, updateUser } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isSetup = location.pathname.startsWith("/setup");

  function load() {
    setStatus("loading");
    api
      .get<{ wallpapers: WallpaperOption[] }>("/wallpapers")
      .then((r) => {
        setOptions(r.wallpapers);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    load();
    setSelected(user?.wallpaperId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.wallpaperId]);

  async function save(next: () => void) {
    if (!selected) return next();
    setSaving(true);
    try {
      const res = await api.patch<{ wallpaperId: string | null; wallpaper: { imageUrl: string | null; themeColor: string | null } | null }>(
        "/preferences",
        { wallpaperId: selected }
      );
      updateUser({ wallpaperId: res.wallpaperId, wallpaper: res.wallpaper });
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
      <PageHeader title={t(isSetup ? "setup.wallpaper.title" : "wallpaper.title")} subtitle={isSetup ? t("setup.wallpaper.subtitle") : undefined} />

      {status === "loading" && <p className="muted">{t("setup.loading")}</p>}

      {status === "error" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-start" }}>
          <p className="muted">{t("setup.wallpaper.loadError")}</p>
          <button className="muted" onClick={load}>
            {t("setup.retry")}
          </button>
        </div>
      )}

      {status === "ready" && options.length === 0 && <p className="muted">{t("setup.wallpaper.empty")}</p>}

      {status === "ready" &&
        options.length > 0 &&
        WALLPAPER_CATEGORIES.map((category) => {
          const items = options.filter((w) => w.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{t(`wallpaper.category.${category}`)}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                {items.map((w) => (
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
                  </button>
                ))}
              </div>
            </div>
          );
        })}

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
