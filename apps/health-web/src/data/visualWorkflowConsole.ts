// Mock data for the owner-facing Visual Workflow Console (issue #131, v1 slice).
// This is NOT a production data source: no persistence layer is wired yet, so
// every record here is a static seed and every review action in the console
// mutates an in-memory copy only (see VisualWorkflowConsole.tsx).

export type VersionStatus =
  | "REFERENCE_ONLY"
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export interface VisualVersion {
  id: string;
  pageId: string;
  versionLabel: string;
  status: VersionStatus;
  createdAt: string;
  designNotes: string;
  sources: string[];
  comparisonTargetId: string | null;
  reviewStatus: string;
}

export interface VisualPage {
  id: string;
  title: string;
  description: string;
}

export const VISUAL_PAGES: VisualPage[] = [
  {
    id: "home",
    title: "Health — Home",
    description: "apps/health-web Home route (/)",
  },
  {
    id: "products",
    title: "Health — Products",
    description: "apps/health-web Products route (/products)",
  },
  {
    id: "sleep-app-entry",
    title: "Health — Sleep App entry",
    description: "apps/health-web Sleep App hand-off card",
  },
];

// The three pre-existing Health visual captures are REFERENCE_ONLY examples
// only (owner correction on issue #131): partial direction, not approved
// final page designs. v2 drafts below are illustrative mock slices created
// for this console and are explicitly unreviewed.
export const VISUAL_VERSIONS: VisualVersion[] = [
  {
    id: "home-v1-reference",
    pageId: "home",
    versionLabel: "v1 (legacy reference capture)",
    status: "REFERENCE_ONLY",
    createdAt: "2026-09-10",
    designNotes:
      "Legacy desktop/mobile capture from the visual pilot baseline suite. Partial direction only — not an approved final design. Do not treat as owner-approved.",
    sources: [
      "tests/visual-baselines/desktop-homepage.png",
      "tests/visual-baselines/mobile-homepage.png",
    ],
    comparisonTargetId: null,
    reviewStatus: "Not submitted for review — reference only",
  },
  {
    id: "home-v2-draft",
    pageId: "home",
    versionLabel: "v2 (console mock draft)",
    status: "DRAFT",
    createdAt: "2026-10-04",
    designNotes:
      "Illustrative draft created to exercise the Visual Workflow Console UI (owner review actions, comparison view). Layout is schematic, not a final design proposal.",
    sources: ["Local draft — no external design file attached yet"],
    comparisonTargetId: "home-v1-reference",
    reviewStatus: "Draft — not yet submitted for owner review",
  },
  {
    id: "products-v1-reference",
    pageId: "products",
    versionLabel: "v1 (legacy reference capture)",
    status: "REFERENCE_ONLY",
    createdAt: "2026-09-10",
    designNotes:
      "Legacy desktop/mobile capture from the visual pilot baseline suite. Partial direction only — not an approved final design.",
    sources: [
      "tests/visual-baselines/desktop-products.png",
      "tests/visual-baselines/mobile-products.png",
    ],
    comparisonTargetId: null,
    reviewStatus: "Not submitted for review — reference only",
  },
  {
    id: "products-v2-ready",
    pageId: "products",
    versionLabel: "v2 (ready for review mock)",
    status: "READY_FOR_REVIEW",
    createdAt: "2026-10-04",
    designNotes:
      "Mock slice showing the READY_FOR_REVIEW state so the owner can exercise Approve / Request changes on a pending version.",
    sources: ["Local draft — no external design file attached yet"],
    comparisonTargetId: "products-v1-reference",
    reviewStatus: "Ready for owner review",
  },
  {
    id: "sleep-app-entry-v1-reference",
    pageId: "sleep-app-entry",
    versionLabel: "v1 (legacy reference capture)",
    status: "REFERENCE_ONLY",
    createdAt: "2026-09-10",
    designNotes:
      "Legacy desktop/mobile capture from the visual pilot baseline suite. Partial direction only — not an approved final design.",
    sources: [
      "tests/visual-baselines/desktop-sleep-app.png",
      "tests/visual-baselines/mobile-sleep-app.png",
    ],
    comparisonTargetId: null,
    reviewStatus: "Not submitted for review — reference only",
  },
];

export const STATUS_LABELS: Record<VersionStatus, string> = {
  REFERENCE_ONLY: "Reference only",
  DRAFT: "Draft",
  READY_FOR_REVIEW: "Ready for review",
  APPROVED: "Approved",
  REJECTED: "Changes requested",
  SUPERSEDED: "Superseded",
};
