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
  // Timezone Auto/Manual (6 Sep 2026) — defaults to "AUTO" to match the
  // schema default; an account created before this feature exists (or a
  // still-loading session) never appears stuck on a phantom "MANUAL".
  const [timezoneMode, setTimezoneMode] = useState(user?.timezoneMode ?? "AUTO");
  const [name, setName] = useState(user?.displayName ?? "");
  const [saved, setSaved] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  // Audit correction (6 Sep 2026) — the toggle previously updated its
  // selected state optimistically with no way to tell the user if the save
  // then actually failed (network error, session expiry), and no saving
  // indicator while the request was in flight.
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [timezoneError, setTimezoneError] = useState(false);

  // Timezone Auto/Manual (6 Sep 2026) — switching to Automatic resolves the
  // device's current zone immediately and atomically in this same PATCH
  // (see routes/preferences.ts), not on some later request. Switching to
  // Manual keeps whatever zone was already in effect as the starting point,
  // editable via the dropdown below.
  async function setMode(nextMode: "AUTO" | "MANUAL") {
    const previousMode = timezoneMode;
    const previousTimezone = timezone;
    setTimezoneMode(nextMode);
    setSaved(false);
    setTimezoneError(false);
    setTimezoneSaving(true);
    try {
      const res = await api.patch<{ timezone: string; timezoneMode: string }>("/preferences", { timezoneMode: nextMode });
      setTimezone(res.timezone);
      updateUser({ timezone: res.timezone, timezoneMode: res.timezoneMode });
      setSaved(true);
    } catch {
      setTimezoneMode(previousMode);
      setTimezone(previousTimezone);
      setTimezoneError(true);
    } finally {
      setTimezoneSaving(false);
    }
  }

  async function saveTimezone(next: string) {
    const previousTimezone = timezone;
    setTimezone(next);
    setSaved(false);
    setTimezoneError(false);
    setTimezoneSaving(true);
    try {
      const res = await api.patch<{ timezone: string; timezoneMode: string }>("/preferences", { timezone: next });
      updateUser({ timezone: res.timezone, timezoneMode: res.timezoneMode });
      setTimezoneMode(res.timezoneMode);
      setSaved(true);
    } catch {
      setTimezone(previousTimezone);
      setTimezoneError(true);
    } finally {
      setTimezoneSaving(false);
    }
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
        <div role="group" aria-label={t("settings.timezoneModeGroupLabel")} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            className={timezoneMode === "AUTO" ? "primary" : ""}
            aria-pressed={timezoneMode === "AUTO"}
            disabled={timezoneSaving}
            onClick={() => setMode("AUTO")}
            style={{ flex: 1, padding: "0.75rem", fontSize: "1rem" }}
          >
            {t("settings.timezoneAuto")}
          </button>
          <button
            type="button"
            className={timezoneMode === "MANUAL" ? "primary" : ""}
            aria-pressed={timezoneMode === "MANUAL"}
            disabled={timezoneSaving}
            onClick={() => setMode("MANUAL")}
            style={{ flex: 1, padding: "0.75rem", fontSize: "1rem" }}
          >
            {t("settings.timezoneManual")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          {timezoneMode === "AUTO" ? t("settings.timezoneAutoHint") : t("settings.timezoneManualHint")}
        </p>
        <select
          id="timezone"
          value={timezone}
          disabled={timezoneMode === "AUTO" || timezoneSaving}
          onChange={(e) => saveTimezone(e.target.value)}
          style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", marginTop: "0.5rem" }}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <p aria-live="polite" className="muted" style={{ marginTop: "0.5rem", minHeight: "1.2em" }}>
          {timezoneSaving ? t("settings.saving") : timezoneError ? t("settings.timezoneSaveError") : saved ? t("settings.saved") : ""}
        </p>
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
