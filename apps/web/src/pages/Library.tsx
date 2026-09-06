import { useEffect, useState } from "react";
import { CONTENT_CATEGORIES, type ContentCategory } from "@asclepios/shared";
import { api } from "../api/client";
import { t, getLocale } from "../i18n";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

interface LibraryItem {
  id: string;
  code: string;
  title: string;
  category: ContentCategory | null;
  bodyMarkdown: string | null;
}

/**
 * Requirement Recovery Matrix #22 — Sleep Answer Library. Groups the
 * seeded ContentItem rows by the 4-category taxonomy; tapping an article
 * expands it in place rather than routing to a separate detail screen —
 * simplest thing that works for text-only V1 content (no video/audio
 * lessons seeded yet).
 */
export default function Library() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ContentCategory>(CONTENT_CATEGORIES[0]);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  function load() {
    setLoadFailed(false);
    api
      .get<{ items: LibraryItem[] }>(`/content?locale=${encodeURIComponent(getLocale())}`)
      .then((r) => setItems(r.items))
      .catch(() => setLoadFailed(true));
  }

  useEffect(load, []);

  const visible = items.filter((i) => i.category === activeCategory);

  return (
    <div className="screen">
      <PageHeader title={t("library.title")} subtitle={t("library.subtitle")} />

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {CONTENT_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setActiveCategory(c);
              setOpenCode(null);
            }}
            style={activeCategory === c ? { borderColor: "var(--color-primary)", fontWeight: 600 } : {}}
          >
            {t(`library.category.${c}`)}
          </button>
        ))}
      </div>

      {loadFailed && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
          <p className="muted">{t("library.loadError")}</p>
          <button className="muted" onClick={load}>
            {t("setup.retry")}
          </button>
        </div>
      )}

      {!loadFailed && visible.length === 0 && items.length > 0 && <p className="muted">{t("library.empty")}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {visible.map((item) => {
          const open = openCode === item.code;
          return (
            <div key={item.id} className="card">
              <button
                onClick={() => setOpenCode(open ? null : item.code)}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, fontWeight: 600, fontSize: "1rem" }}
              >
                {item.title}
              </button>
              {open && item.bodyMarkdown && <p style={{ marginTop: "0.6rem", marginBottom: 0 }}>{item.bodyMarkdown}</p>}
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
