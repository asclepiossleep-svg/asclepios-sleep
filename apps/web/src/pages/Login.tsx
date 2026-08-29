import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t } from "../i18n";
import "../styles/login.css";

interface DemoAccount {
  email: string;
  label: string;
  scenario: string;
}

// Design moodboard 28 Aug 2026 — first-time users go through Setup
// (Wallpaper -> Theme Colour) before ever reaching Home/Tonight; returning
// users (wallpaperId already chosen) land straight on Home. Admin accounts
// bypass both and go to the back office, same as before.
function landingRoute(user: { role: string; wallpaperId?: string | null }): string {
  if (user.role === "ADMIN") return "/admin";
  return user.wallpaperId ? "/home" : "/setup/wallpaper";
}

/**
 * Front-page/Login rebuild (29 Aug 2026) — Edmund's brief: the previous
 * screen (logo + one sentence + plain email box) read as generic SaaS, not
 * the premium sleep/wellness entrance the rest of the app's design moodboard
 * promises. This replaces it with a two-part composition:
 *
 *  - A scenic, CSS-only "day to night" hero (no licensed photography exists
 *    yet, so — same honest-build pattern as the synthesized Sleep Player
 *    audio and the text-only Sleep Answer Library — the atmosphere is built
 *    from layered gradients/shapes, not a stock photo). It keys off the same
 *    [data-theme] attribute App.tsx already sets from local time, so the
 *    "Daylight -> Nightfall" idea is one shared mechanism, not new state.
 *  - A floating login panel (redesigned card, "Try Demo" as a clear but
 *    secondary reveal rather than always-open) — functionally identical to
 *    before (same OTP flow, same demo accounts endpoint), just restyled.
 *
 * Brand colours are @asclepios/shared's THEME_COLORS (same six presets as
 * the Theme Colour picker), not invented here — one palette, reused.
 */
export default function Login() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoPassword, setDemoPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const { setToken } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    // Staging-only endpoint — 404s in production, so this silently no-ops there.
    api.get<DemoAccount[]>("/demo/accounts").then(setDemoAccounts).catch(() => setDemoAccounts([]));
  }, []);

  async function requestCode() {
    setError(null);
    try {
      const res = await api.post<{ sent: boolean; devCode?: string }>("/auth/otp/request", { email });
      setDevCode(res.devCode ?? null);
      setStep("code");
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function verifyCode() {
    setError(null);
    try {
      const res = await api.post<{ token: string; user: any }>("/auth/otp/verify", {
        email,
        code,
        locale: navigator.language.startsWith("zh") ? "zh-HK" : "en",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setToken(res.token, res.user);
      navigate(landingRoute(res.user));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function startDemo(demoEmail: string) {
    setError(null);
    try {
      const res = await api.post<{ token: string; user: any }>("/demo/login", { email: demoEmail, password: demoPassword });
      setToken(res.token, res.user);
      navigate(landingRoute(res.user));
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-scene" aria-hidden="true">
          <span className="login-hill login-hill--back" />
          <span className="login-hill login-hill--mid" />
          <span className="login-orb" />
          <span className="login-hill login-hill--front" />
          <span className="login-water" />
        </div>

        <div className="login-hero-content">
          <div className="login-brand">
            <svg className="login-brand-mark" width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
              <circle cx="17" cy="17" r="15.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M17 24c-4-2.5-6-6-5-10.5C13.5 9 17 8 17 8s3.5 1 5 5.5c1 4.5-1 8-5 10.5Z"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
              />
            </svg>
            <span className="login-brand-name">{t("welcome.title")}</span>
          </div>

          <p className="login-tagline">{t("welcome.subtitle")}</p>
          <p className="login-lead">{t("welcome.lead")}</p>

          <div className="login-values">
            <div className="login-value">
              <svg className="login-value-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 6v4l2.6 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div>
                <strong>{t("welcome.value.understand.title")}</strong>
                <p>{t("welcome.value.understand.body")}</p>
              </div>
            </div>
            <div className="login-value">
              <svg className="login-value-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 15.5V6.8c0-.8.5-1.4 1.3-1.6L10 4l4.7 1.2c.8.2 1.3.8 1.3 1.6v8.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 15.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div>
                <strong>{t("welcome.value.prepare.title")}</strong>
                <p>{t("welcome.value.prepare.body")}</p>
              </div>
            </div>
            <div className="login-value">
              <svg className="login-value-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3.5 14.5 8 9.8l3 3 5.5-6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 6.5h3.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <strong>{t("welcome.value.improve.title")}</strong>
                <p>{t("welcome.value.improve.body")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="card login-card">
          {step === "email" ? (
            <>
              <label className="login-field-label" htmlFor="email">
                {t("login.emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="login-input"
              />
              <button className="primary" onClick={requestCode} style={{ marginTop: "0.9rem", width: "100%" }} disabled={!email}>
                {t("login.sendCode")}
              </button>
            </>
          ) : (
            <>
              <label className="login-field-label" htmlFor="code">
                {t("login.codeLabel")}
              </label>
              <input id="code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} className="login-input" />
              {devCode && <p className="muted login-dev-code">Dev only — code: {devCode}</p>}
              <button className="primary" onClick={verifyCode} style={{ marginTop: "0.9rem", width: "100%" }} disabled={code.length !== 6}>
                {t("login.verify")}
              </button>
            </>
          )}
          {error && <p className="login-error">{error}</p>}
        </div>

        {demoAccounts.length > 0 && (
          <>
            {!showDemo ? (
              <button className="login-demo-toggle" onClick={() => setShowDemo(true)}>
                {t("login.tryDemo")}
              </button>
            ) : (
              <div className="card">
                <div className="login-demo-header">
                  <h2>{t("login.demoSelector")}</h2>
                  <button onClick={() => setShowDemo(false)}>{t("login.hideDemo")}</button>
                </div>
                <input
                  type="password"
                  placeholder="DEMO_PASSWORD (staging only)"
                  value={demoPassword}
                  onChange={(e) => setDemoPassword(e.target.value)}
                  className="login-input"
                  style={{ marginTop: "0.75rem" }}
                />
                <div className="login-demo-list">
                  {demoAccounts.map((a) => (
                    <button key={a.email} onClick={() => startDemo(a.email)} title={a.scenario}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
