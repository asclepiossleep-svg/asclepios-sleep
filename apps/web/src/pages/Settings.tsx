import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t } from "../i18n";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

// A short curated list rather than the full IANA database — enough to cover
// this project's current markets (UK, Romania, Hong Kong) plus a few common
// travel destinations (Doc 03 §1 "Travel/timezone change" scenario).
const TIMEZONES = [
  "Europe/London",
  "Europe/Bucharest",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export default function Settings() {
  const { user, updateUser, logout } = useSession();
  const [timezone, setTimezone] = useState(user?.timezone ?? "Europe/London");
  const [name, setName] = useState(user?.displayName ?? "");
  const [saved, setSaved] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  async function saveTimezone(next: string) {
    setTimezone(next);
    setSaved(false);
    const res = await api.patch<{ timezone: string }>("/preferences", { timezone: next });
    updateUser({ timezone: res.timezone });
    setSaved(true);
  }

  // 31 Aug 2026 — Edmund's feedback: the app never asked for a name and
  // greeted people with their email prefix instead. Lets an existing
  // account (his own real one included) set or change it any time; blank
  // clears it back to the email-prefix fallback on Home.
  async function saveName() {
    setNameSaved(false);
    const res = await api.patch<{ displayName: string | null }>("/preferences", { displayName: name });
    updateUser({ displayName: res.displayName });
    setNameSaved(true);
  }

  return (
    <div className="screen">
      <PageHeader title={t("settings.title")} />

      <div className="card">
        <label htmlFor="displayName">{t("settings.name")}</label>
        <input
          id="displayName"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameSaved(false);
          }}
          placeholder={t("login.namePlaceholder")}
          style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", marginTop: "0.5rem" }}
        />
        <button className="primary" onClick={saveName} style={{ marginTop: "0.5rem" }}>
          {t("settings.save")}
        </button>
        {nameSaved && <p className="muted">{t("settings.saved")}</p>}
      </div>

      <div className="card">
        <label htmlFor="timezone">{t("settings.timezone")}</label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => saveTimezone(e.target.value)}
          style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", marginTop: "0.5rem" }}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        {saved && <p className="muted">{t("settings.saved")}</p>}
      </div>

      <Link to="/wallpaper" className="card" style={{ textDecoration: "none", color: "var(--color-text)" }}>
        {t("settings.wallpaper")}
      </Link>
      <Link to="/theme" className="card" style={{ textDecoration: "none", color: "var(--color-text)" }}>
        {t("settings.theme")}
      </Link>

      <button onClick={logout} style={{ marginTop: "auto" }}>
        {t("settings.logout")}
      </button>

      <BottomNav />
    </div>
  );
}
