# VISUAL asset manifest contract v1.1

Status: pilot implementation, Goal `HEALTH-VISUAL-PILOT-001`
Parent: `docs/automation/AMANDA_OS_V1_1.md`
Enforced by: `scripts/ci/verify-visual-manifest.mjs`, wired into
`required-build-gate.yml`.

## Purpose

This is the versioned-asset-package contract the Amanda OS VISUAL Goal
Issue requires before Rex may use any owner-approved page visual in
`apps/health-web`. It exists so no page can go live from "an approved
screenshot" alone — every production visual must first be converted into a
manifest-listed, hash-verified, owner-approved asset.

This document does not create a second controller or source of truth: the
Goal Issue remains the only record of business completion, and this file
only describes the deterministic file/CI contract that Goal's evidence
depends on.

## Layout

```
apps/health-web/src/assets/pages/
  manifest.schema.json          # the contract itself (draft-07 JSON Schema)
  <page>/
    <version>/                  # e.g. home/v1
      manifest.json
      approved-<page>-reference.png   # single owner-approved full reference
      source/                   # owner-approved source design file(s)
      web/                      # owner-approved desktop/web production visual(s)
      mobile/                   # owner-approved mobile production visual(s)
```

Only files reachable through this structure may be treated as
manifest-governed page visuals. Any other image already in
`apps/health-web/src/assets/**` (e.g. the existing hero photo, brand mark)
predates this contract and is out of scope for the pilot — see the Goal
Issue's "Home page pilot only. Do not redesign architecture."

## Manifest lifecycle

`status` moves through:

- `PENDING_OWNER_ASSET` — scaffold exists (this directory structure, an
  empty `assets` array, `approved_reference.sha256 = null`). No owner has
  supplied a reference yet. This is **not** a hard CI failure — it is an
  honest, currently-true state for a page whose real approved asset has not
  been delivered.
- `APPROVED` — the owner has supplied the reference image, it has been
  converted into `source/`, `web/`, `mobile/` derivatives, every asset
  (including the reference) has a recorded and verified sha256, and every
  asset carries `owner_approved: true` plus a non-empty `approval_record`
  pointing at durable approval evidence (e.g. a Goal Issue comment URL).
- `SUPERSEDED` — replaced by a newer version directory (e.g. `v2`).
  Changing an approved asset's *content* always requires a new version
  directory, never an in-place overwrite of an `APPROVED` version.
- `REJECTED` — the owner declined this version; kept for audit history.

Rex must never write `APPROVED` into a manifest by inventing, generating,
or substituting an image. That status may only be set once a real
owner-approved file exists on disk with a verifiable hash and an
`approval_record`.

## What `scripts/ci/verify-visual-manifest.mjs` enforces

Each check below is named to match the Goal Issue's required check list:

| Check | What it verifies |
|---|---|
| `manifest-schema` | every `manifest.json` under the pages root is valid JSON, is an object, and `schema_version` is `"1.1"` |
| `manifest-required-fields` | every required top-level/nested field from `manifest.schema.json` is present with a legal value/shape |
| `asset-naming-version` | the manifest's `page`/`version` fields match the directory it lives in, and the version directory matches `v<N>` |
| `approved-asset-existence` | every asset path with a recorded (non-null) sha256 exists on disk |
| `approved-asset-hashes` | the sha256 recomputed from disk matches the value recorded in the manifest |
| `approved-asset-only` | every image file physically present under the pages root is claimed by some manifest, and lives at an approved root (reference file, or `source/`, `web/`, `mobile/`) |
| `no-external-visuals` | no `apps/health-web/src` `.tsx`/`.ts`/`.css` file references a remote `http(s)` image URL |
| `no-unapproved-generation` | every listed asset (and the reference, once a version is `APPROVED`) carries `owner_approved: true` and a non-empty `approval_record` |

This script has no third-party dependency and is safe to run inside
`required-build-gate.yml` for every PR — when `apps/health-web/src/assets/pages`
has no manifests yet it exits 0 with a note; once manifests exist it fails
the build on any invariant violation.

## What is intentionally not in this script

- Vercel preview reachability and preview-commit consistency are covered by
  the existing `deployment-verification.yml` (`scripts/verify-deployment.mjs`),
  which already ties a GitHub `deployment_status` event's `environment_url`
  to the deploying commit SHA. This contract does not duplicate that.
- PR-head / CI-tested / manifest-commit SHA consistency for *business
  completion* is reconciled by the existing Amanda Goal Controller
  (`.github/workflows/amanda-goal-controller.yml`), which already refuses to
  mark a Goal `COMPLETE` unless the recorded commit SHA matches the PR head
  and all GitHub-required checks are green. `delivery_evidence.*` fields in
  each manifest exist so a human/PR description can record the same values
  for cross-reference, not to create a second binding authority.
- Desktop/mobile screenshot capture already exists in
  `tests/health-browser-smoke.mjs` (`browser-smoke-gate.yml`). Manifest-aware
  pixel comparison against an `APPROVED` reference is the next increment
  once a real owner-approved asset exists — building and testing that logic
  against zero real assets would itself be an unapproved-generation risk.
