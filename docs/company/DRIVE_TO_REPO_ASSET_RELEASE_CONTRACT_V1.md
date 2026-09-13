# Drive -> Repo Asset Release Contract V1

Owner: Amanda
Status: IMPLEMENTATION-READY — structural fields ENFORCED IN CI; Drive-side
steps are a manual/owner-directed procedure (no Drive credential exists in
this repository)
Scope: `apps/health-web/asset-manifest.json` production assets; the pattern
extends to any future app-scoped asset manifest that adopts the same schema
Goal: Amanda OS v1.0 completion (Issue #120), bounded work item 2

## Purpose

Work item 1 (`docs/company/PRODUCTION_ASSET_ALLOWLIST_GATE_V1.md`) made the
repository the deterministic production source for images `apps/health-web`
ships, but left `drive_reference` an unenforced, always-`null` placeholder.
This contract defines the minimum enforceable release/sync rule connecting
Google Drive's human-facing `APPROVED_CURRENT` state to a repo manifest
entry, without giving the website or any CI job runtime access to Drive.

## Split of authority

- **Google Drive** (`/Asclepios/04_WEBSITE_APP/...` per
  `docs/company/DIGITAL_ASSET_STRUCTURE_METADATA_PLAN_V1.md` §1/§5) remains
  the human-facing source library: staging, review and the
  `APPROVED_CURRENT` state live there. Drive is where a human finds and
  approves the latest master.
- **The repository** (`asset-manifest.json` + the committed binary) is the
  deterministic production source. `apps/health-web` never reads Drive at
  build or run time — only the committed file and its manifest entry.
- No runtime code, build step, or CI job calls the Google Drive API in this
  repository. There is no automated Drive puller because no Drive service
  account/credential is provisioned here
  (`docs/sum/09_AGENT_EXTERNAL_TOOLING.md`: "If a required provider is
  unavailable, Rex must not invent a result... it marks NOT WIRED"; the CRM/DAM
  provider row in `docs/sum/05_PROVIDER_ADAPTER_REGISTRY.md` is TBC). The
  release procedure below is a human/owner-directed checklist, not a
  scheduled job.

## `drive_reference` schema

Every manifest entry's `drive_reference` field must be exactly one of two
controlled shapes. No other value is permitted; CI rejects anything else.

**1. Object** — required for every asset released through this contract
from now on:

```json
{
  "drive_file_id": "<Google Drive file ID of the exact APPROVED_CURRENT master>",
  "drive_folder_path": "<human Drive path, e.g. '/Asclepios/04_WEBSITE_APP/Brand/APPROVED_CURRENT'>",
  "drive_status_at_release": "APPROVED_CURRENT",
  "captured_at": "<ISO date the release actor captured this reference>"
}
```

All four sub-fields are required and non-empty; `drive_status_at_release`
must literally be `APPROVED_CURRENT` (this contract only ever releases from
that Drive state, per `DIGITAL_ASSET_STRUCTURE_METADATA_PLAN_V1.md` §5).

**2. Sentinel string** `"NOT_APPLICABLE_PRE_CONTRACT_DIRECT_UPLOAD"` —
reserved only for assets approved and committed **before** this contract
existed, that never had a Drive-side master because the owner uploaded them
directly to GitHub. The two current `apps/health-web` entries
(`ASC-HEALTH-BRAND-GFX-0001`, `ASC-HEALTH-HOME-IMG-0001`) use this sentinel,
because their real provenance is the owner's "Add files via upload" commits
`a8dd540` / `35afbf6`, not a Drive folder. Using this sentinel for anything
else would fabricate release history and is forbidden — CI has no way to
detect misuse of this escape hatch beyond the general rule that inventing
facts is against the AMANDA OS hard rules, so it must never be applied to a
genuinely Drive-sourced asset.

## Release procedure (manual — human/owner-directed)

When a Drive-side asset in `APPROVED_CURRENT` needs to become, or replace, a
production asset in `apps/health-web`:

1. Confirm in Drive that the source file's status is `APPROVED_CURRENT`.
   Record its Drive file ID and folder path.
2. Download the exact approved binary and commit it to the target
   `repo_path` under `apps/health-web/src/assets/...`. The committed bytes
   must be the approved master, not a re-export or "close enough" copy.
3. Mint a new, immutable `asset_id` (never reuse an old one — asset IDs are
   immutable per `docs/company/DIGITAL_ASSET_REGISTRY_SCHEMA_V1.md`).
   - Replacing an existing production asset: new `version` = previous
     entry's `version` + 1, and new entry's `supersedes_asset_id` =
     previous entry's `asset_id`.
   - Wholly new asset: `version` = 1, `supersedes_asset_id` = `null`.
4. Compute `checksum_sha256` of the committed file
   (`sha256sum <path>` or equivalent) and set it on the new entry.
5. Set `approved_at` / `approved_by` to the Drive-recorded approval
   date/approver — never invent a date or approver not evidenced in
   Drive/owner communication.
6. Set `source_ref` to the commit SHA that introduces the binary, mirroring
   the convention the two pre-contract entries already use.
7. Set `drive_reference` to the object form above.
8. If replacing a prior asset: on the **old** entry, set `status =
   "REPLACED"` and `superseded_by_asset_id = "<new asset_id>"`. Never delete
   the old entry — replacement history stays queryable in the manifest.
9. Update the app source import to point at the new `repo_path`.
10. Run `npm run check:asset-manifest` locally; it must `PASS` before
    opening a PR.

## What CI enforces (deterministic, no Drive access required)

`scripts/ci/verify-asset-manifest.mjs` (already the first step of `npm run
build`, per `docs/company/PRODUCTION_ASSET_ALLOWLIST_GATE_V1.md`) enforces,
in addition to work item 1's checks:

- `drive_reference` is present on every manifest entry and is either the
  controlled object shape (all four sub-fields present and non-empty,
  `drive_status_at_release` literally `APPROVED_CURRENT`) or exactly the
  `NOT_APPLICABLE_PRE_CONTRACT_DIRECT_UPLOAD` sentinel. Any other shape
  fails with the offending `asset_id` and the two allowed forms.
- Replacement history is bidirectionally consistent: a `supersedes_asset_id`
  / `superseded_by_asset_id` pair must point at real, matching manifest
  entries on both sides.
- A `REPLACED` entry must have `superseded_by_asset_id` set; conversely any
  entry with `superseded_by_asset_id` set must have status `REPLACED` (an
  asset cannot be both currently approved and replaced).
- An `APPROVED`/`PUBLISHED` entry must not carry `superseded_by_asset_id`.
- Where a supersession link exists, the newer entry's `version` must be
  strictly greater than the entry it supersedes.
- (Carried over from work item 1) approved binaries exist, match their
  checksum, and every image `apps/health-web` source references resolves to
  an `APPROVED`/`PUBLISHED` manifest entry.

## What remains manual / NOT WIRED

- There is no automated Drive -> repo puller; no Drive credential is
  available to this repository. The release procedure above is a
  human/owner-directed checklist, not a scheduled job.
- CI cannot verify that a `drive_file_id` still resolves to
  `APPROVED_CURRENT` inside Drive at build time — it verifies only that the
  repo-side record is internally consistent and that the committed binary
  is byte-identical to what the manifest claims was approved. Drive-side
  truth is trusted at the moment a human performs steps 1-2 above; periodic
  manual reconciliation (owner or Amanda audit) remains the control for
  later drift, consistent with `docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md`'s
  cross-system drift check.

## Non-goals of this bounded item

- No runtime website code path may call the Drive API (Issue #120's
  explicit requirement).
- This contract does not build a general DAM; it only extends the existing
  minimum enforceable slice from work item 1 to also cover Drive-origin
  provenance and replacement lineage for `apps/health-web`.
