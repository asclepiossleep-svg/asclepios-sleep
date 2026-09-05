import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t, setLocale, SUPPORTED_LOCALES, useLocale } from "../i18n";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

// 31 Aug 2026 fix — Edmund's feedback: the original 7-zone curated list
// ("enough to cover this project's current markets") was too narrow once
// real users outside those markets started signing up. `Intl.supportedValuesOf`
// gives the browser's full official IANA list (~400 zones, every country)
// on any reasonably current browser (Chrome 99+/Safari 15.4+/2022 onward) —
// no server round trip, always current. FALLBACK_TIMEZONES only kicks in on
// an older browser that lacks `supportedValuesOf`, so nobody sees an empty
// dropdown; it's a broad country-by-country spread, not just our 3 markets.
const FALLBACK_TIMEZONES = [
  "Pacific/Midway", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Tijuana",
  "America/Denver", "America/Phoenix", "America/Chicago", "America/Mexico_City", "America/New_York",
  "America/Toronto", "America/Bogota", "America/Lima", "America/Halifax", "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires", "Atlantic/Azores", "Europe/London", "Europe/Dublin", "Europe/Lisbon",
  "Europe/Madrid", "Europe/Paris", "Europe/Amsterdam", "Europe/Berlin", "Europe/Rome", "Europe/Bucharest",
  "Europe/Athens", "Europe/Helsinki", "Europe/Istanbul", "Europe/Moscow", "Africa/Cairo", "Africa/Lagos",
  "Africa/Johannesburg", "Africa/Nairobi", "Asia/Jerusalem", "Asia/Dubai", "Asia/Tehran", "Asia/Karachi",
  "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok", "Asia/Jakarta", "Asia/Shanghai", "Asia/Hong_Kong",
  "Asia/Taipei", "Asia/Singapore", "Asia/Seoul", "Asia/Tokyo", "Australia/Perth", "Australia/Adelaide",
  "Australia/Sydney", "Australia/Brisbane", "Pacific/Auckland", "Pacific/Fiji",
];

function getTimezones(): string[] {
  try {
    // @ts-ignore — supportedValuesOf isn't in every TS lib target yet
    const list: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return list.length > 0 ? list : FALLBACK_TIMEZONES;
  } catch {
    return FALLBACK_TIMEZONES;
  }
}

const TIMEZONES = getTimezones();

export default function Settings() {
  const { user, updateUser, logout } = useSession();
  const locale = useLocale();
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

  // Language persistence (5 Sep 2026) — previously the only place to set
  // locale was the pre-login Login page's selector; there was no way to
  // change it once signed in short of logging out and registering again in
  // another language. setLocale() flips the whole app (App.tsx remounts on
  // it) immediately; the PATCH persists it to the account so it survives
  // refresh/reopen/logout-login/PWA relaunch on any device, the same way
  // timezone already does above.
  async function changeLanguage(next: string) {
    setLocale(next);
    const res = await api.patch<{ locale: string }>("/preferences", { locale: next });
    updateUser({ locale: res.locale });
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
        <label htmlFor="language">{t("settings.language")}</label>
        <select
          id="language"
          value={locale}
          onChange={(e) => changeLanguage(e.target.value)}
          style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", marginTop: "0.5rem" }}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
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
              {tz.replace(/_/g, " ")}
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
