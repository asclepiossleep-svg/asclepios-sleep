import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t, getLocale, setLocale, SUPPORTED_LOCALES } from "../i18n";
import "../styles/login.css";
import heroPhoto from "../assets/hero/login-hero-photo.webp";
import brandMark from "../assets/brand/asclepios-mark.webp";

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
 * Front-page/Login rebuild #2 (29 Aug 2026) — Edmund supplied an approved
 * reference design (real lifestyle photography, not the illustrated
 * day/night scene this page shipped with a day earlier) with an explicit
 * brief: "The supplied new login design is approved. Please implement it,
 * not reinterpret it." This replaces the illustrated hero + separate
 * floating panel with:
 *
 *  - A left content column: brand mark, language selector, headline,
 *    tagline, lead copy, the (unchanged) email/OTP login card, a
 *    security reassurance line, demo access, then the three value props.
 *  - A right/full-bleed photo column (single approved photo — no
 *    day/night crossfade this pass; the mechanism can come back once a
 *    matching night photo exists).
 *  - A working language selector (English / 繁體中文 / 简体中文) that
 *    switches every t() string on this page live, and is sent as the new
 *    user's locale on verify — previously this was inferred silently from
 *    navigator.language.
 *
 * Brand name logic (Edmund's brief §2): "ASCLEPIOS" always shows; "阿斯康"
 * shows only when the active locale is a Chinese one. Layout mechanics are
 * documented in login.css.
 *
 * Auth flow (OTP request/verify, demo login) is untouched — this is a
 * visual/i18n change only.
 */
export default function Login() {
  // 31 Aug 2026 — explicit Login vs Register, per Edmund's rule: the old
  // single "type your email" flow silently created an account for anyone,
  // with no way to tell the two intents apart. Backend enforcement is in
  // apps/api/src/routes/auth.ts's /otp/verify (mode param).
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  // 31 Aug 2026 — Edmund's feedback: the app never asked for a name and
  // just showed the email prefix on Home instead. Asked once, on Register
  // only — an existing account (Login tab) already has whatever name it
  // was given, or can add one later from Settings.
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoPassword, setDemoPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());
  const { setToken, user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    // Staging-only endpoint — 404s in production, so this silently no-ops there.
    api.get<DemoAccount[]>("/demo/accounts").then(setDemoAccounts).catch(() => setDemoAccounts([]));
  }, []);

  // 31 Aug 2026 fix — Edmund's report: reopening the app still asked for a
  // fresh code even though the session was actually restoring fine
  // underneath (confirmed via server logs — GET /auth/session kept
  // succeeding right before each "need to login again" report). Root
  // cause: this page never checked whether a session had already been
  // restored — session.tsx's own mount effect (api/client.ts's stored
  // token + GET /auth/session) runs everywhere in the app, but /login
  // itself just always rendered the empty form regardless, with no
  // redirect-away-if-already-logged-in. Anyone whose browser opens
  // straight back to /login (a bookmark, a home-screen icon, iOS Safari
  // restoring its last tab) saw this every single time, even mid-session.
  useEffect(() => {
    if (!loading && user) {
      navigate(landingRoute(user), { replace: true });
    }
  }, [loading, user, navigate]);

  function changeLocale(next: string) {
    setLocale(next);
    setLocaleState(next);
  }

  const showChineseBrandName = locale.startsWith("zh");

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
    setAccountNotFound(false);
    try {
      const res = await api.post<{ token: string; user: any }>("/auth/otp/verify", {
        email,
        code,
        locale,
        mode,
        name: mode === "register" ? name : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setToken(res.token, res.user);
      navigate(landingRoute(res.user));
    } catch (e: any) {
      if (e.message === "account_not_found") {
        setAccountNotFound(true);
      } else {
        setError(e.message);
      }
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
      <div className="login-topcontent">
        <div className="login-topbar">
          <div className="login-brand">
            <img src={brandMark} alt="" className="login-brand-mark" aria-hidden="true" />
            <span className="login-brand-lockup">
              <span className="login-brand-name">
                ASCLEPIOS
                {showChineseBrandName && <span className="login-brand-name-zh"> 阿斯康</span>}
              </span>
              <span className="login-brand-sub">SLEEP</span>
            </span>
          </div>

          <label className="login-lang-select" aria-label="Language">
            <span className="login-lang-icon" aria-hidden="true">
              🌐
            </span>
            <select value={locale} onChange={(e) => changeLocale(e.target.value)}>
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h1 className="login-hero-title">{t("welcome.heroTitle")}</h1>
        <p className="login-tagline">{t("welcome.subtitle")}</p>
        <p className="login-lead">{t("welcome.lead")}</p>
      </div>

      <div className="login-photo" aria-hidden="true">
        <img src={heroPhoto} alt="" />
      </div>

      <div className="login-bottomcontent">
        <div className="card login-card">
          {step === "email" && (
            <div className="login-mode-tabs" role="tablist" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => setMode("login")}
                className={mode === "login" ? "primary" : undefined}
                style={{ flex: 1 }}
              >
                {t("login.tabLogin")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => setMode("register")}
                className={mode === "register" ? "primary" : undefined}
                style={{ flex: 1 }}
              >
                {t("login.tabRegister")}
              </button>
            </div>
          )}
          {step === "email" ? (
            <>
              {mode === "register" && (
                <>
                  <label className="login-field-label" htmlFor="name">
                    {t("login.nameLabel")}
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("login.namePlaceholder")}
                    className="login-input"
                    style={{ marginBottom: "0.75rem" }}
                  />
                </>
              )}
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
              <p className="login-secure-note">🔒 {t("welcome.secure")}</p>
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
              {accountNotFound && (
                <p className="login-error">
                  {t("login.accountNotFound")}{" "}
                  <button type="button" onClick={() => { setMode("register"); setAccountNotFound(false); }}>
                    {t("login.tabRegister")}
                  </button>
                </p>
              )}
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

        <div className="login-values">
          <div className="login-value">
            <span className="login-value-icon-wrap">
              <svg className="login-value-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 6v4l2.6 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <strong>{t("welcome.value.understand.title")}</strong>
              <p>{t("welcome.value.understand.body")}</p>
            </div>
          </div>
          <div className="login-value">
            <span className="login-value-icon-wrap">
              <svg className="login-value-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 15.5V6.8c0-.8.5-1.4 1.3-1.6L10 4l4.7 1.2c.8.2 1.3.8 1.3 1.6v8.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 15.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <strong>{t("welcome.value.prepare.title")}</strong>
              <p>{t("welcome.value.prepare.body")}</p>
            </div>
          </div>
          <div className="login-value">
            <span className="login-value-icon-wrap">
              <svg className="login-value-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3.5 14.5 8 9.8l3 3 5.5-6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 6.5h3.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <strong>{t("welcome.value.improve.title")}</strong>
              <p>{t("welcome.value.improve.body")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
