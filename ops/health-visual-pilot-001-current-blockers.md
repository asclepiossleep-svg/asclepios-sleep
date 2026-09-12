# HEALTH-VISUAL-PILOT-001 — Current deterministic blockers

Canonical PR: #116 (`visual/home-v1-pilot-114`)

Last verified CI state after the Sleep App binary repair:

- `sleep_app_card`: approved binary now matches and no longer appears in manifest-policy failures.
- `approved-home-reference.png`: wrong bytes/hash; not a valid decodable PNG.
- `health-home-hero-v1.webp`: bytes/hash do not match the approved target.
- `health-home-products-card-v1.webp`: bytes/hash do not match the approved target and current committed file is not a valid WebP.
- browser and visual workflows now enforce the manifest/approved-asset policy before rendering checks, preventing misleading green results while governed assets are invalid.
- Goal must remain `BLOCKED`; PR must remain draft/unmerged until governed assets pass and exact-SHA Vercel preview evidence is available.

Approved target SHA-256 values:

- Home reference: `4c85ab47d3e009219d191950ac9990832dd4a2ad696b892445060687f0dffb12`
- Hero: `b3b9a4c4df319fb68b8035f52d5bf6fcfaa74c39c5dc7f690218d40e7cbe25af`
- Products card: `a44f04a181f33675009ea2279c8079c1c267c72162baf834674e3d98f99e8045`
- Sleep App card: `b24cd1b3b4b5246936265b01a92c8ee2ea9fb1fa371557fce9075453111844e8`

This file is operational status only and must not be treated as completion evidence.
