import { Fragment, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./state/session";
import { useLocale } from "./i18n";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Wallpaper from "./pages/Wallpaper";
import ThemeColor from "./pages/ThemeColor";
import Settings from "./pages/Settings";
import Assessment from "./pages/Assessment";
import Tonight from "./pages/Tonight";
import SleepPlayer from "./pages/SleepPlayer";
import MorningCheckin from "./pages/MorningCheckin";
import Review from "./pages/Review";
import Library from "./pages/Library";
import Programmes from "./pages/Programmes";
import Admin from "./pages/Admin";
import MusicLibrary from "./pages/MusicLibrary";
import NowPlaying from "./pages/NowPlaying";
import AppBackground from "./components/AppBackground";
import MusicPlayerBar from "./components/MusicPlayerBar";
import InstallPrompt from "./components/InstallPrompt";

// Doc 05 §7 — day/night theme follows local time by default; a real build
// lets the user override this from Settings (not wired in this scaffold).
function useAutoTheme() {
  useEffect(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    document.documentElement.setAttribute("data-theme", isNight ? "night" : "day");
  }, []);
}

// Design moodboard 28 Aug 2026 — Theme Colour picker. Applied as an inline
// CSS-variable override on the root element, which beats both the plain
// :root rule and the [data-theme="night"] rule in specificity, so the
// user's chosen accent stays consistent across day and night wallpapers.
// Clearing it (no themeColor chosen yet) falls back to tokens.css defaults.
function useUserThemeColor(themeColor?: string | null) {
  useEffect(() => {
    const root = document.documentElement;
    if (themeColor) {
      root.style.setProperty("--color-primary", themeColor);
      root.style.setProperty("--color-accent", themeColor);
    } else {
      root.style.removeProperty("--color-primary");
      root.style.removeProperty("--color-accent");
    }
  }, [themeColor]);
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useSession();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useSession();
  if (loading) return null;
  return <Navigate to={user ? "/home" : "/login"} replace />;
}

export default function App() {
  const { user } = useSession();
  const locale = useLocale();
  useAutoTheme();
  useUserThemeColor(user?.themeColor);

  // Language persistence (5 Sep 2026) — `t()` reads a plain module variable
  // (apps/web/src/i18n), not React state, so screens already mounted when
  // Settings changes the language wouldn't otherwise pick up new strings
  // until they next re-rendered for an unrelated reason. Keying the whole
  // routed subtree (plus the always-mounted MusicPlayerBar) on the active
  // locale forces every t()-calling component to remount and re-read it the
  // moment it changes, so "updates immediately" is actually true app-wide.
  return (
    <Fragment key={locale}>
      {/* App-wide wallpaper (29 Aug 2026) — rendered once, behind every
          route. Login isn't affected (it renders its own hero and this
          layer is a no-op — null — until user.wallpaper.imageUrl exists,
          which only happens after login; see AppBackground.tsx). */}
      <AppBackground />
      {/* PWA/Home Screen audit (6 Sep 2026) — only offered once signed in,
          same reasoning as MusicPlayerBar below: Login already carries its
          own hero/copy and doesn't need install nagging competing for
          attention before someone has a reason to trust the app. */}
      {user && <InstallPrompt />}
      <Routes>
        <Route path="/login" element={<Login />} />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/setup/wallpaper"
        element={
          <RequireAuth>
            <Wallpaper />
          </RequireAuth>
        }
      />
      <Route
        path="/setup/theme"
        element={
          <RequireAuth>
            <ThemeColor />
          </RequireAuth>
        }
      />
      <Route
        path="/wallpaper"
        element={
          <RequireAuth>
            <Wallpaper />
          </RequireAuth>
        }
      />
      <Route
        path="/theme"
        element={
          <RequireAuth>
            <ThemeColor />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Settings />
          </RequireAuth>
        }
      />
      <Route
        path="/learn"
        element={
          <RequireAuth>
            <Library />
          </RequireAuth>
        }
      />
      <Route
        path="/programmes"
        element={
          <RequireAuth>
            <Programmes />
          </RequireAuth>
        }
      />
      <Route
        path="/assessment"
        element={
          <RequireAuth>
            <Assessment />
          </RequireAuth>
        }
      />
      <Route
        path="/tonight"
        element={
          <RequireAuth>
            <Tonight />
          </RequireAuth>
        }
      />
      <Route
        path="/player/:sessionId"
        element={
          <RequireAuth>
            <SleepPlayer />
          </RequireAuth>
        }
      />
      <Route
        path="/checkin"
        element={
          <RequireAuth>
            <MorningCheckin />
          </RequireAuth>
        }
      />
      <Route
        path="/review"
        element={
          <RequireAuth>
            <Review />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <Admin />
          </RequireAuth>
        }
      />
      <Route
        path="/music"
        element={
          <RequireAuth>
            <MusicLibrary />
          </RequireAuth>
        }
      />
      <Route
        path="/music/now-playing"
        element={
          <RequireAuth>
            <NowPlaying />
          </RequireAuth>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
      </Routes>
      {/* Music Library V1 (31 Aug 2026) — persistent mini-player, rendered
          once outside <Routes> (same reasoning as AppBackground above) so
          "play only, repeat until stop" actually survives navigating to a
          different page instead of stopping the moment MusicLibrary
          unmounts. No-ops (renders null) until a track is playing. */}
      <MusicPlayerBar />
    </Fragment>
  );
}
