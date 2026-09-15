# HEALTH-VISUAL-PILOT-001 Release State

This file is a durable release record for the Asclepios Health Home v1 visual pilot. GitHub remains the system of record and Amanda Goal Controller remains the only Goal-level authority.

## Current state

- Goal ID: `HEALTH-VISUAL-PILOT-001`
- Page: `home`
- Version: `v1`
- Canonical PR: `#116`
- Release state: `ASSET_BLOCKED`
- Do not merge while any governed asset fails deterministic policy.

## Required state machine

`DRAFT -> DESIGN_APPROVED -> ASSET_BLOCKED | READY_FOR_IMPLEMENTATION -> IMPLEMENTED -> CI_VERIFIED -> PREVIEW_DEPLOYED -> VISUAL_REVIEW_PENDING -> VISUAL_APPROVED -> READY_TO_MERGE -> MERGED -> PRODUCTION_DEPLOYED -> PRODUCTION_VERIFIED -> COMPLETE`

Any failed deterministic check moves the release to `BLOCKED` with the exact reason. `COMPLETE` requires the same approved release commit to be tied to deployment evidence and desktop/mobile visual verification.

## Current deterministic blockers

Latest CI on PR #116 reports these governed asset failures:

1. `approved-home-reference.png`
   - manifest SHA-256: `4c85ab47d3e009219d191950ac9990832dd4a2ad696b892445060687f0dffb12`
   - repository bytes do not match this checksum
   - repository file is not a valid decodable PNG
2. `health-home-hero-v1.webp`
   - manifest SHA-256: `b3b9a4c4df319fb68b8035f52d5bf6fcfaa74c39c5dc7f690218d40e7cbe25af`
   - repository bytes do not match this checksum
3. `health-home-products-card-v1.webp`
   - manifest SHA-256: `a44f04a181f33675009ea2279c8079c1c267c72162baf834674e3d98f99e8045`
   - repository bytes do not match this checksum

## Approved visual acceptance target

The Health Home must use the approved direction only:

- Asclepios Health header
- rear-view woman facing mountain/lake sunrise hero
- exact headline `Better Sleep. Healthier Living.`
- CTA `Explore Products`
- CTA `Enter Sleep App`
- Products card
- Sleep App card
- Learning & Courses card
- only individually approved visual assets
- no side-profile woman hero
- no old Chinese copy
- no old CTA/layout
- no generic or invented product imagery

## Deployment binding requirement

Before merge/production approval, record and verify:

- implementation commit SHA
- approved asset manifest SHA/checksums
- Vercel Health project identity
- root directory `apps/health-web`
- preview deployment URL tied to the exact release SHA
- production deployment URL and production commit SHA
- desktop visual evidence
- mobile visual evidence

The Sleep deployment must remain separate and unchanged by this Health release.
