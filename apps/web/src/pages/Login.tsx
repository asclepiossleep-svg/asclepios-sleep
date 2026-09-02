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
  // 31 Aug 2026 — password login, added at Edmund's explicit request: real
  // transactional email still isn't wired up, so a 6-digit code is
  // literally unreachable for anyone who isn't Edmund reading the server
  // logs for them. A second, fully independent credential path — email
  // code stays the default/first option, password is a switchable
  // alternative, not a replacement (see routes/auth.ts's /password/*).
  const [authMethod, setAuthMethod] = useState<"code" | "password">("code");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoPassword, setDemoPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());
  const { setToken, user, loading } = useSession();
  const navigate = useNavigate();

  // 1 Sep 2026 — Edmund: the Demo Selector must not be visible on the
  // public front page to ordinary visitors; it's only for an authorised
  // auditor (e.g. ChatGPT) given the special link with ?demo=1. Everyone
  // else never fetches or sees it.
  const demoAccessAllowed = new URLSearchParams(window.location.search).get("demo") === "1";

  useEffect(() => {
    if (!demoAccessAllowed) return;
    // Staging-only endpoint — 404s in production, so this silently no-ops there.
    api.get<DemoAccount[]>("/demo/accounts").then(setDemoAccounts).catch(() => setDemoAccounts([]));
  }, [demoAccessAllowed]);

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
    if (!loading && user)
