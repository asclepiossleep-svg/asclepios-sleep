import { Fragment, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./state/session";
import { useLocale } from "./i18n";
import PublicHome from "./pages/PublicHome";
import PublicProducts from "./pages/PublicProducts";
import PublicProductDetail from "./pages/PublicProductDetail";
import PublicEducation from "./pages/PublicEducation";
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

function MemberRedirect() {
  const { user, loading } = useSession();
  if (loading) return null;
  return <Navigate to={user ? "/home" : "/login"} replace />;
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
        <Route path="/" element={<PublicHome />} />
        <Route path="/products" element={<PublicProducts />} />
        <Route path="/products/:productId" element={<PublicProductDetail />} />
        <Route path="/education" element={<PublicEducation />} />
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
