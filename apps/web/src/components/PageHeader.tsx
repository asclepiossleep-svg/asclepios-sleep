import { ReactNode } from "react";

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
 */
export default function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
  );
}
