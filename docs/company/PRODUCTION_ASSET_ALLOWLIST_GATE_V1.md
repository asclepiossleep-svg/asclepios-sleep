# Production Asset Allowlist Gate V1

Owner: Amanda
Status: IMPLEMENTATION-READY, ENFORCED IN CI
Scope: `apps/health-web` production image references
Goal: Amanda OS v1.0 completion (Issue #120), bounded work item 1

## Purpose

Turn `docs/company/DIGITAL_ASSET_REGISTRY_SCHEMA_V1.md` into a deterministic
CI gate: every production image `apps/health-web` actually ships must
resolve to a repository-readable, owner-approved allowlist entry. No
unregistered, superseded, placeholder, generated or invented image may
reach production, and product packaging in particular must never be
invented (`docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md`).

This is the minimum enforceable subset of the full Digital Asset Registry —
not a replacement for it. The full registry (campaigns, video, audio, CS
assets, rights expiry queues) stays in the Drive-based system described in
`DIGITAL_ASSET_STRUCTURE_METADATA_PLAN_V1.md`. This gate only covers the
narrow slice that is load-bearing for what ships to
`https://asclepios-health.vercel.app/`.

## The manifest

`apps/health-web/asset-manifest.json` is the repository-readable production
asset manifest for `apps/health-web`. It is a synced allowlist: a minimal
projection of the relevant Digital Asset Registry rows, scoped to assets
actually referenced by this app.

Each entry carries:

| Field | Required | Notes |
|---|---:|---|
| `asset_id` | yes | immutable, unique, `ASC-HEALTH-<TOPIC>-<TYPE>-<SERIAL>` |
| `title` | yes | human-readable |
| `asset_type` | yes | see `DIGITAL_ASSET_REGISTRY_SCHEMA_V1.md` enum |
| `product_code` | conditional | required when the asset is product/packaging-specific |
| `language` | yes | `EN` / `ZH-HK` / `ZH-CN` / `MULTI` / `N-A` |
| `version` | yes | starts at 1, increases per family |
| `status` | yes | controlled — see below |
| `owner_role` | yes | accountable role |
| `created_at` / `updated_at` | yes | ISO date |
| `approved_at` / `approved_by` | yes for active status | who/when approved production use |
| `source_ref` | yes | git commit SHA or Drive reference proving provenance |
| `rights_status` | yes | `OWNED` / `LICENSED` / `THIRD_PARTY_APPROVED` / `PENDING` / `RESTRICTED` |
| `repo_path` | yes | exact committed path, repo-root relative |
| `checksum_sha256` | yes | binds the asset ID to the exact committed bytes |
| `archive_class` | yes | `HOT` / `WARM` / `COLD` |
| `supersedes_asset_id` / `superseded_by_asset_id` | optional | replacement history, kept even after retirement |
| `drive_reference` | optional | reserved for the Drive->repo release contract (work item 2); not required to be populated yet |

### Status enum (superset of the registry schema, for this gate)

`DRAFT`, `INTERNAL_REVIEW`, `CLAIMS_REVIEW`, `OWNER_REVIEW`, `APPROVED`,
`PUBLISHED`, `RETIRED`, `ARCHIVED`, `REFERENCE_ONLY`, `REPLACED`,
`PLACEHOLDER`, `GENERATED`, `INVENTED`.

Only `APPROVED` and `PUBLISHED` may be actively referenced by app source.
Every other status is retained for history/traceability but fails CI the
moment app code imports that `repo_path`.

## The gate

`scripts/ci/verify-asset-manifest.mjs`, run on every PR/push touching `main`
via `required-build-gate.yml`, enforces:

1. **Manifest schema** — every entry has the required fields, a known
   status, and a unique `asset_id`/`repo_path`.
2. **Approved binaries are real and unmodified** — every `APPROVED`/
   `PUBLISHED` entry's file must exist and its SHA-256 must match
   `checksum_sha256`. A file changed without a manifest update (re-approval
   or new version) fails the build; this stops a swapped-in image from
   silently inheriting a prior approval.
3. **Every referenced image is registered and approved** — the script scans
   `apps/health-web/src/**/*.{ts,tsx,css}` and `index.html` for image
   imports/`url()`/`src`/`href` references, resolves each to a repo path,
   and requires a manifest entry whose status is `APPROVED` or `PUBLISHED`.
   Unregistered references fail with the exact file:line and the required
   action (register an Asset ID). External (`http(s)://`) or inline
   (`data:`) image references fail outright — production images must be
   committed, reviewed repository assets.
4. **Non-approved statuses fail loudly** — a reference to a `REFERENCE_ONLY`,
   `REPLACED`, `PLACEHOLDER`, `GENERATED`, `INVENTED`, `RETIRED` or
   `ARCHIVED` entry fails with guidance specific to that status (e.g.
   "switch to the superseding asset_id").
5. **Packaging cannot be invented** — any reference that looks like
   packaging/label art (by `asset_type` or path/filename) that is not a
   rights-cleared `APPROVED`/`PUBLISHED` entry fails with an explicit
   pointer to `docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md`.

CI output always names the offending file, the offending path, and the
required Asset ID action — never a bare pass/fail.

## Current allowlisted assets

As of this gate's introduction, `apps/health-web` references exactly two
images, both traced directly to owner uploads (GitHub "Add files via
upload" commits on the `asclepiossleep-svg` account) and unmodified since:

| Asset ID | File | Source commit |
|---|---|---|
| `ASC-HEALTH-BRAND-GFX-0001` | `apps/health-web/src/assets/brand/asclepios-mark.webp` | `a8dd54065d8b7dbac288d1c879ceebc00b0bc690` |
| `ASC-HEALTH-HOME-IMG-0001` | `apps/health-web/src/assets/hero/health-hero-sunrise.webp` | `35afbf6bc067ca62b6c8db04218e334b09b18d91` |

No Phase 1 product/packaging image is referenced anywhere in
`apps/health-web` today (`src/data/products.ts` carries only text fields —
see its own comment on `docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md`). That is
correct: Phase 1 packaging is not yet approved, so no packaging image may
exist in the manifest or in code until the owner approves one through the
release contract below.

## Relationship to work item 2 (Drive -> repo release contract)

This gate assumes manifest entries already exist with real
`source_ref`/`approved_by`/`checksum_sha256` values. It intentionally does
not define *how* a new Drive `APPROVED_CURRENT` asset becomes a new
manifest entry — that minimal release/sync contract (preserving asset ID,
version, approval date/source, production filename, and replacement
history, without requiring runtime Drive access) is the next bounded work
item under Issue #120 and will populate the `drive_reference` field this
schema already reserves.

## Local usage

```bash
node scripts/ci/verify-asset-manifest.mjs
```

Run from the repository root. Exits non-zero and prints every violation if
the allowlist is not satisfied.
