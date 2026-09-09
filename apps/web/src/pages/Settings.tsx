import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t, setLocale, SUPPORTED_LOCALES, useLocale } from "../i18n";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

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

const sectionStyle: CSSProperties = {
  borderRadius: "1.35rem",
  padding: "1rem",
  background: "color-mix(in srgb, var(--color-surface) 94%, white 6%)",
  border: "1px solid color-mix(in srgb, var(--color-border) 78%, transparent)",
  boxShadow: "0 10px 30px rgba(25, 54, 61, 0.06)",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  minHeight: "3rem",
  padding: "0.78rem 0.9rem",
  marginTop: "0.5rem",
  borderRadius: "0.9rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: "1rem",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontWeight: 650,
  fontSize: "0.98rem",
  letterSpacing: "0.01em",
};

const statusStyle: CSSProperties = {
  margin: "0.6rem 0 0",
  fontSize: "0.9rem",
};

const preferenceLinkStyle: CSSProperties = {
  ...sectionStyle,
  minHeight: "3.65rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  textDecoration: "none",
  color: "var(--color-text)",
  fontWeight: 650,
};

export default function Settings() {
  const { user, updateUser, logout } = useSession();
  const locale = useLocale();
  const [timezone, setTimezone] = useState(user?.timezone ?? "Europe/London");
  const [name, setName] = useState(user?.displayName ?? "");
  const [saved, setSaved] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [timezoneError, setTimezoneError] = useState(false);
  const [languageError, setLanguageError] = useState(false);
  const [nameError, setNameError] = useState(false);

  async function saveTimezone(next: string) {
    const previous = timezone;
    setTimezone(next);
    setSaved(false);
    setTimezoneError(false);
    try {
      const res = await api.patch<{ timezone: string }>("/preferences", { timezone: next });
      updateUser({ timezone: res.timezone });
      setSaved(true);
    } catch {
      setTimezone(previous);
      setTimezoneError(true);
    }
  }

  async function changeLanguage(next: string) {
    const previous = locale;
    setLocale(next);
    setLanguageError(false);
    try {
      const res = await api.patch<{ locale: string }>("/preferences", { locale: next });
      updateUser({ locale: res.locale });
    } catch {
      setLocale(previous);
      setLanguageError(true);
    }
  }

  async function saveName() {
    setNameSaved(false);
    setNameError(false);
    try {
      const res = await api.patch<{ displayName: string | null }>("/preferences", { displayName: name });
      updateUser({ displayName: res.displayName });
      setNameSaved(true);
    } catch {
      setNameError(true);
    }
  }

  return (
    <div className="screen" style={{ paddingBottom: "6.5rem" }}>
      <PageHeader title={t("settings.title")} />

      <div
        style={{
          display: "grid",
          gap: "0.85rem",
          width: "100%",
          maxWidth: "42rem",
          margin: "0 auto",
        }}
      >
        <section style={sectionStyle}>
          <label htmlFor="displayName" style={labelStyle}>{t("settings.name")}</label>
          <input
            id="displayName"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameSaved(false);
            }}
            placeholder={t("login.namePlaceholder")}
            style={fieldStyle}
          />
          <button
            className="primary"
            onClick={saveName}
            style={{ width: "100%", minHeight: "3rem", marginTop: "0.7rem", borderRadius: "0.9rem" }}
          >
            {t("settings.save")}
          </button>
          <div aria-live="polite">
            {nameSaved && <p className="muted" style={statusStyle}>{t("settings.saved")}</p>}
            {nameError && <p style={{ ...statusStyle, color: "var(--color-danger)" }}>{t("settings.saveError")}</p>}
          </div>
        </section>

        <section style={sectionStyle}>
          <label htmlFor="language" style={labelStyle}>{t("settings.language")}</label>
          <select
            id="language"
            value={locale}
            onChange={(e) => changeLanguage(e.target.value)}
            style={fieldStyle}
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <div aria-live="polite">
            {languageError && <p style={{ ...statusStyle, color: "var(--color-danger)" }}>{t("settings.saveError")}</p>}
          </div>
        </section>

        <section style={sectionStyle}>
          <label htmlFor="timezone" style={labelStyle}>{t("settings.timezone")}</label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => saveTimezone(e.target.value)}
            style={fieldStyle}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <div aria-live="polite">
            {saved && <p className="muted" style={statusStyle}>{t("settings.saved")}</p>}
            {timezoneError && <p style={{ ...statusStyle, color: "var(--color-danger)" }}>{t("settings.saveError")}</p>}
          </div>
        </section>

        <Link to="/wallpaper" style={preferenceLinkStyle}>
          <span>{t("settings.wallpaper")}</span>
          <span aria-hidden="true" style={{ fontSize: "1.45rem", opacity: 0.55 }}>›</span>
        </Link>
        <Link to="/theme" style={preferenceLinkStyle}>
          <span>{t("settings.theme")}</span>
          <span aria-hidden="true" style={{ fontSize: "1.45rem", opacity: 0.55 }}>›</span>
        </Link>

        <button
          onClick={logout}
          style={{
            minHeight: "3.15rem",
            marginTop: "0.2rem",
            borderRadius: "0.95rem",
            fontWeight: 650,
          }}
        >
          {t("settings.logout")}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
