import { useEffect, useState } from "react";
import { api } from "../api/client";
import { t } from "../i18n";
import { FeatureFlags } from "@asclepios/shared";

interface Product {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

/**
 * Doc 06 §8 Definition of Done — "Admin 能自行新增產品...". This is the
 * thin end of the admin surface: enough to prove config lives in the DB,
 * not in the customer UI (Doc 01 §5). Extend with Question/Rule/Content
 * tabs the same way — they hit the same generic /admin/:entity CRUD router.
 */
export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  function reload() {
    api.get<Product[]>("/admin/products").then(setProducts);
    api.get<FeatureFlags>("/feature-flags").then(setFlags);
  }

  useEffect(reload, []);

  async function addProduct() {
    if (!newCode || !newName) return;
    await api.post("/admin/products", { code: newCode, name: newName, active: true });
    setNewCode("");
    setNewName("");
    reload();
  }

  async function toggleFlag(key: keyof FeatureFlags) {
    if (!flags) return;
    await api.patch(`/feature-flags/${key}`, { enabled: !flags[key] });
    reload();
  }

  return (
    <div className="screen">
      <h1>{t("admin.title")}</h1>

      <div className="card">
        <h2>Feature Flags</h2>
        {flags &&
          (Object.keys(flags) as (keyof FeatureFlags)[]).map((key) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
              <span>{key}</span>
              <button onClick={() => toggleFlag(key)}>{flags[key] ? "ON" : "OFF"}</button>
            </div>
          ))}
      </div>

      <div className="card">
        <h2>Products</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{p.active ? "active" : "inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <input placeholder="code" value={newCode} onChange={(e) => setNewCode(e.target.value)} style={{ flex: 1 }} />
          <input placeholder="name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 2 }} />
          <button className="primary" onClick={addProduct}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
