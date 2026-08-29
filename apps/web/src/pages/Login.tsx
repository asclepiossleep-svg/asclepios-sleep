import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t } from "../i18n";

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
 * Supplement 07 §3, §6, §19 — Welcome -> Create account / Sign in. Email
 * OTP is the V1 primary path (no password). QR / Enter Activation Code are
 * simply not rendered while product_activation_qr stays OFF — there is no
 * hidden/disabled state to maintain, the entry points just don't exist in
 * this component while the flag defaults off.
 */
export default function Login() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoPassword, setDemoPassword] = useState("");
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
    <div className="screen">
      <h1>{t("welcome.title")}</h1>
      <p className="muted">{t("welcome.subtitle")}</p>

      <div className="card">
        {step === "email" ? (
          <>
            <label htmlFor="email">{t("login.emailLabel")}</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", marginTop: "0.5rem" }} />
            <button className="primary" onClick={requestCode} style={{ marginTop: "0.75rem", width: "100%" }} disabled={!email}>
              {t("login.sendCode")}
            </button>
          </>
        ) : (
          <>
            <label htmlFor="code">{t("login.codeLabel")}</label>
            <input id="code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", marginTop: "0.5rem" }} />
            {devCode && <p className="muted">Dev only — code: {devCode}</p>}
            <button className="primary" onClick={verifyCode} style={{ marginTop: "0.75rem", width: "100%" }} disabled={code.length !== 6}>
              {t("login.verify")}
            </button>
          </>
        )}
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
      </div>

      {demoAccounts.length > 0 && (
        <div className="card">
          <h2>{t("login.demoSelector")}</h2>
          <input
            type="password"
            placeholder="DEMO_PASSWORD (staging only)"
            value={demoPassword}
            onChange={(e) => setDemoPassword(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginBottom: "0.75rem" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {demoAccounts.map((a) => (
              <button key={a.email} onClick={() => startDemo(a.email)} title={a.scenario}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
