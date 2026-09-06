import { ReactNode } from "react";
import BackButton from "./BackButton";

/**
 * App-wide wallpaper (29 Aug 2026) — every page's title/subtitle used to sit
 * bare on the flat --color-bg. Now that a real photo can sit behind the
 * whole screen (see AppBackground + body.has-wallpaper in tokens.css), bare
 * text can't rely on a fixed light/dark colour token — a photo's brightness
 * varies panel to panel. Rather than flip global text colour (which would
 * also affect text sitting inside a card, and break its own contrast), the
 * heading gets its own small frosted veil pill — same visual language as
 * .card, just tighter. When there's no wallpaper (body without
 * .has-wallpaper), tokens.css strips the veil back to nothing, so this
 * renders identically to the old bare <h1>/<p className="muted"> pair.
 *
 * Go Back audit (6 Sep 2026) — `onBack`/`backTo` are opt-in: the persistent
 * bottom-nav screens (Home, Tonight, Review, Settings, ...) already have a
 * return path and must not grow a redundant back arrow, so only the
 * drill-in screens that pass one of these props get it.
 */
export default function PageHeader({
  title,
  subtitle,
  onBack,
  backTo,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: boolean;
  backTo?: string;
}) {
  return (
    <div className="page-header" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {(onBack || backTo) && (
        <div>
          <BackButton to={backTo} />
        </div>
      )}
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
  );
}
