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
  // Lineage to a local source-intake record (v3 slice, issue #131). Null for
  // every pre-existing seed and for drafts created without going through the
  // Source Intake panel — it is set only when a draft is created from an
  // exact selected LocalSourceRecord.
  sourceId: string | null;
  comparisonTargetId: string | null;
  // Explicit parent-version lineage (v4 slice, issue #131). Null unless this
  // version was created via "Create next DRAFT from brief" — distinct from
  // comparisonTargetId so a brief-derived draft always records both, even
  // when they happen to point at the same version id.
  parentVersionId: string | null;
  // Lineage to the exact IterationBrief this DRAFT was created from (v4
  // slice, issue #131). Null for every pre-existing seed and for drafts not
  // created via "Create next DRAFT from brief".
  iterationBriefId: string | null;
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
    sourceId: null,
    comparisonTargetId: null,
    parentVersionId: null,
    iterationBriefId: null,
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
    sourceId: null,
    comparisonTargetId: "home-v1-reference",
    parentVersionId: null,
    iterationBriefId: null,
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
    sourceId: null,
    comparisonTargetId: null,
    parentVersionId: null,
    iterationBriefId: null,
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
    sourceId: null,
    comparisonTargetId: "products-v1-reference",
    parentVersionId: null,
    iterationBriefId: null,
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
    sourceId: null,
    comparisonTargetId: null,
    parentVersionId: null,
    iterationBriefId: null,
    reviewStatus: "Not submitted for review — reference only",
  },
];

// Local source-intake metadata (v3 slice, issue #131). Records provenance
// only: no URL is fetched, no file is uploaded/read, no image is generated,
// and no checksum/manifest/asset byte is computed or touched. In-memory for
// this browser tab only — resets on reload, same as versions/decisions.
export type SourceType = "URL_REFERENCE" | "FILE_REFERENCE" | "SCREENSHOT_REFERENCE";
export type SourceStatus = "UNVERIFIED_REFERENCE";

export interface LocalSourceRecord {
  sourceId: string;
  sourceType: SourceType;
  label: string;
  originText: string;
  provenanceNotes: string;
  createdAt: string;
  status: SourceStatus;
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  URL_REFERENCE: "URL reference",
  FILE_REFERENCE: "File reference",
  SCREENSHOT_REFERENCE: "Screenshot reference",
};

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  UNVERIFIED_REFERENCE: "Unverified reference",
};

// Local Iteration Brief metadata (v4 slice, issue #131). A brief is bound to
// exact version/comparison/source IDs, not page labels — it records planning
// intent only (objective/required changes/constraints/acceptance notes), no
// image/asset generation or external model call. In-memory for this browser
// tab only — resets on reload, same as versions/sources/decisions.
export type IterationBriefStatus = "ITERATION_BRIEF_DRAFT";

export interface IterationBrief {
  briefId: string;
  // Exact selected/source-derived version ID this brief was written against.
  selectedVersionId: string;
  // Exact comparison target version ID at the moment the brief was created.
  comparisonTargetId: string;
  // Linked source provenance snapshot, when the selected version carries one.
  sourceId: string | null;
  sourceType: SourceType | null;
  sourceLabel: string | null;
  sourceOriginText: string | null;
  sourceProvenanceNotes: string | null;
  objective: string;
  requiredChanges: string;
  preserveConstraints: string;
  acceptanceNotes: string;
  createdAt: string;
  status: IterationBriefStatus;
}

export const ITERATION_BRIEF_STATUS_LABELS: Record<IterationBriefStatus, string> = {
  ITERATION_BRIEF_DRAFT: "Iteration brief draft",
};

// A structured local decision record created by a review action (issue #131,
// v2 slice; source lineage added in the v3 slice; iteration-brief lineage
// added in the v4 slice). Rendered/copyable/downloadable in the console
// only — never sent over the network and never written to a database or
// git. The source and iteration-brief fields are full snapshots taken at
// commit time, not just an id, because the linked LocalSourceRecord /
// IterationBrief are themselves session-local and discarded on reload — a
// decision exported before reload must still be able to show its own
// claimed provenance/brief on its own.
export interface DecisionRecord {
  decisionId: string;
  selectedVersionId: string;
  comparisonTargetId: string | null;
  sourceId: string | null;
  sourceType: SourceType | null;
  sourceLabel: string | null;
  sourceOriginText: string | null;
  sourceProvenanceNotes: string | null;
  iterationBriefId: string | null;
  iterationBriefStatus: IterationBriefStatus | null;
  iterationBriefObjective: string | null;
  iterationBriefRequiredChanges: string | null;
  iterationBriefPreserveConstraints: string | null;
  iterationBriefAcceptanceNotes: string | null;
  previousStatus: VersionStatus;
  newStatus: VersionStatus;
  reviewNote: string;
  timestamp: string;
  scope: "LOCAL_PREVIEW_ONLY";
}

export const STATUS_LABELS: Record<VersionStatus, string> = {
  REFERENCE_ONLY: "Reference only",
  DRAFT: "Draft",
  READY_FOR_REVIEW: "Ready for review",
  APPROVED: "Approved",
  REJECTED: "Changes requested",
  SUPERSEDED: "Superseded",
};
