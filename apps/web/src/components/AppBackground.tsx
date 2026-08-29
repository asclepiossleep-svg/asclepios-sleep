import { useEffect } from "react";
import { useSession } from "../state/session";

/**
 * App-wide wallpaper (29 Aug 2026) — Edmund's brief: every post-login screen
 * should show the user's chosen Wallpaper photo full-bleed (Home, Tonight,
 * the picker itself, Theme Colour, Morning Check-in, Progress/Review, etc.),
 * not just Login and the picker's own tiles. Rendered once, high in the
 * component tree (see App.tsx), fixed behind everything (.screen and its
 * children sit at z-index:1, see tokens.css).
 *
 * Toggles `body.has-wallpaper` so tokens.css can switch .card/.page-header/
 * BottomNav from solid to frosted-glass only when there's actually a photo
 * to float over — a user who hasn't completed Wallpaper setup yet (or is on
 * /login, rendered outside this component) sees the exact same flat
 * --color-bg screens as before.
 */
export default function AppBackground() {
  const { user } = useSession();
  const imageUrl = user?.wallpaper?.imageUrl ?? null;

  useEffect(() => {
    document.body.classList.toggle("has-wallpaper", !!imageUrl);
    return () => {
      document.body.classList.remove("has-wallpaper");
    };
  }, [imageUrl]);

  if (!imageUrl) return null;

  return (
    <>
      <div className="app-wallpaper-bg" style={{ backgroundImage: `url(${imageUrl})` }} aria-hidden="true" />
      <div className="app-wallpaper-scrim" aria-hidden="true" />
    </>
  );
}
