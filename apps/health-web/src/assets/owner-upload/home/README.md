# Owner Home Image Upload Slot

This folder is the simple owner/admin upload point for the Asclepios Health Home page.

Upload the owner-approved originals here. Do not resize, convert, rename after upload, or paste base64/text into image files.

Current required upload slots:

1. `approved-home-reference.png`
   - Full approved Home reference image.
   - Expected SHA-256: `4c85ab47d3e009219d191950ac9990832dd4a2ad696b892445060687f0dffb12`

2. `home-hero.jpeg`
   - Owner-approved rear-view woman / mountain-lake sunrise hero source.
   - Known owner-source SHA-256: `ed51a2b6d6de513f8696b7e0737f82a5f506a84c67c414d9b52cb6f05398c798`

3. `home-products-card.jpeg`
   - Owner-approved Products-card source image.
   - This must be the image the Owner wants displayed on the Home Products card. The pipeline must calculate and register its exact SHA after upload; it must not silently reuse an unrelated/corrupt WebP.

Operating rule:
- Owner/Admin uploads images here.
- Automation validates file signature + SHA/provenance.
- Automation then registers/releases the approved production asset.
- No AI should invent, substitute, crop the full-page reference, or silently change an approved asset.

This folder is an intake slot, not a second source of truth. GitHub remains the implementation source of truth and Amanda remains the only Goal-level controller.
