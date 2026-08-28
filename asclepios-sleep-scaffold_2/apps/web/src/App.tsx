import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./state/session";
import Login from "./pages/Login";
import Assessment from "./pages/Assessment";
import Tonight from "./pages/Tonight";
import SleepPlayer from "./pages/SleepPlayer";
import MorningCheckin from "./pages/MorningCheckin";
import Review from "./pages/Review";
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

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useSession();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  useAutoTheme();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
