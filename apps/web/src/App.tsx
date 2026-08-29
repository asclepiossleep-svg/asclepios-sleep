import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./state/session";
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
import Admin from "./pages/Admin";

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
  useAutoTheme();
  useUserThemeColor(user?.themeColor);

  return (
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
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
