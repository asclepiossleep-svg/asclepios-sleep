import { Fragment, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./state/session";
import { useActiveSleepSession } from "./state/activeSession";
import { useLocale } from "./i18n";
import PublicHome from "./pages/PublicHome";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import SleepApp from "./pages/SleepApp";
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

function useAutoTheme() {
  useEffect(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    document.documentElement.setAttribute("data-theme", isNight ? "night" : "day");
  }, []);
}

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

// P0 continuity requirement (6 Sep 2026 owner directive) — cold entry
// (refresh, browser restart, PWA relaunch) must resume an in-progress sleep
// session rather than reset to Home/first step. Only decide the logged-in
// target once the active-session check has actually resolved, so a slow
// network doesn't cause a Home flash before redirecting to the player.
function MemberRedirect() {
  const { user, loading } = useSession();
  const { session, loaded } = useActiveSleepSession(!!user);
  if (loading || (!!user && !loaded)) return null;
  const target = session ? `/player/${session.id}` : "/home";
  return <Navigate to={user ? target : "/login"} replace />;
}

export default function App() {
  const { user } = useSession();
  const locale = useLocale();
  useAutoTheme();
  useUserThemeColor(user?.themeColor);

  return (
    <Fragment key={locale}>
      <AppBackground />
      {user && <InstallPrompt />}
      <Routes>
        {/* Public commercial front door. Member Home remains a separate authenticated surface. */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/sleep-app" element={<SleepApp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/member" element={<MemberRedirect />} />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/setup/wallpaper" element={<RequireAuth><Wallpaper /></RequireAuth>} />
        <Route path="/setup/theme" element={<RequireAuth><ThemeColor /></RequireAuth>} />
        <Route path="/wallpaper" element={<RequireAuth><Wallpaper /></RequireAuth>} />
        <Route path="/theme" element={<RequireAuth><ThemeColor /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/learn" element={<RequireAuth><Library /></RequireAuth>} />
        <Route path="/programmes" element={<RequireAuth><Programmes /></RequireAuth>} />
        <Route path="/assessment" element={<RequireAuth><Assessment /></RequireAuth>} />
        <Route path="/tonight" element={<RequireAuth><Tonight /></RequireAuth>} />
        <Route path="/player/:sessionId" element={<RequireAuth><SleepPlayer /></RequireAuth>} />
        <Route path="/checkin" element={<RequireAuth><MorningCheckin /></RequireAuth>} />
        <Route path="/review" element={<RequireAuth><Review /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
        <Route path="/music" element={<RequireAuth><MusicLibrary /></RequireAuth>} />
        <Route path="/music/now-playing" element={<RequireAuth><NowPlaying /></RequireAuth>} />
        <Route path="*" element={<MemberRedirect />} />
      </Routes>
      <MusicPlayerBar />
    </Fragment>
  );
}
