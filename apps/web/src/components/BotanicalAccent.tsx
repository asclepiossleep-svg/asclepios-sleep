/**
 * Decorative line-art leaf/branch flourish for the Asclepios Health public
 * marketing pages (issue #45 reference design's "botanical accents"). No
 * botanical illustration/photo asset exists in the repo, so this SVG line
 * drawing is the closest available stand-in — purely decorative (aria-hidden).
 */
export default function BotanicalAccent({ className }: { className?: string }) {
  return (
    <svg
      className={`botanical-accent ${className ?? ""}`.trim()}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M50 96C50 96 20 78 20 45C20 22 38 6 50 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M50 4C62 6 80 22 80 45C80 60 72 71 62 78"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M50 20C44 26 40 33 40 41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 34C57 39 61 46 61 54" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 48C43 54 39 61 39 69" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 62C57 67 60 73 60 80" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
