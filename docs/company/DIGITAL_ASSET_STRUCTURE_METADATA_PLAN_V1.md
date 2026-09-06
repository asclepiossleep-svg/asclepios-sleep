# Digital Asset Structure & Metadata Plan V1

Owner: Amanda
Status: ACTIVE DESIGN CHECKPOINT
Priority: launch continuity / operations

## Purpose
Create one durable, searchable structure for Asclepios production assets so product, website, CS, marketing and future staff can find the latest approved source without depending on chat history or individual memory.

This plan intentionally separates:
- GitHub = versioned structured text/specifications/code/decision records;
- Google Drive or approved asset store = human production files and working media;
- object storage/CDN = production-delivered media;
- database = dynamic operational/customer/order data.

Do not use GitHub as a bulk image/video/audio warehouse.

## 1. Canonical top-level asset folders
Recommended Drive structure:

`/Asclepios`
- `00_GOVERNANCE`
- `01_RESEARCH_EVIDENCE`
- `02_PRODUCT`
- `03_BRAND`
- `04_WEBSITE_APP`
- `05_MARKETING_GROWTH`
- `06_VIDEO`
- `07_AUDIO_VOICE`
- `08_CUSTOMER_SERVICE`
- `09_OPERATIONS_COMMERCE`
- `10_PUBLISHED_MASTERS`
- `90_ARCHIVE`

RockPillar-specific work should sit under a separate `/RockPillar` root using the same governance principles rather than mixing unrelated company assets.

## 2. Product substructure
For each product/SKU:
`02_PRODUCT/<PRODUCT_CODE>/`
- `00_SOURCE_SUPPLIER`
- `01_PRODUCT_KNOWLEDGE`
- `02_PACKAGING_LABEL`
- `03_IMAGES_RAW`
- `04_IMAGES_APPROVED`
- `05_USAGE_SAFETY`
- `06_REGULATORY_CLAIMS`
- `07_WEBSITE_COPY_EXPORTS`
- `08_QR_ENTITLEMENT`
- `90_RETIRED`

Example product codes should remain stable even if marketing names change.

## 3. Marketing / media substructure
`05_MARKETING_GROWTH/`
- `CAMPAIGNS/<CAMPAIGN_ID>/BRIEF`
- `CAMPAIGNS/<CAMPAIGN_ID>/COPY`
- `CAMPAIGNS/<CAMPAIGN_ID>/STORYBOARD`
- `CAMPAIGNS/<CAMPAIGN_ID>/CREATIVE_WORKING`
- `CAMPAIGNS/<CAMPAIGN_ID>/APPROVED`
- `CAMPAIGNS/<CAMPAIGN_ID>/PUBLISHED_EXPORTS`
- `EVERGREEN_PRODUCT_CONTENT`
- `EDUCATION_CONTENT`

`06_VIDEO/`
- `RAW`
- `PROJECT_FILES`
- `VOICE_SUBTITLE`
- `REVIEW_EXPORTS`
- `APPROVED_MASTERS`
- `CHANNEL_VARIANTS`

`07_AUDIO_VOICE/`
- `RAW_VOICE`
- `SCRIPT_SOURCE`
- `EDITED`
- `APPROVED_MASTERS`
- `APP_CHANNEL_EXPORTS`

## 4. Mandatory asset metadata
Every production-relevant asset should carry, in a sidecar registry or equivalent metadata table:
- `asset_id`
- `title`
- `asset_type`
- `company` (Asclepios / RockPillar)
- `product_code?`
- `sku?`
- `campaign_id?`
- `topic`
- `language`
- `market/jurisdiction?`
- `channel?`
- `version`
- `status`
- `owner_role`
- `created_at`
- `updated_at`
- `approved_at?`
- `approved_by?`
- `source/evidence_ref?`
- `claims_status?`
- `usage_rights/licence?`
- `expiry/review_date?`
- `supersedes_asset_id?`
- `published_location/url?`
- `archive_class`
- `checksum/hash?` for final masters where practical.

## 5. Status model
Use only controlled statuses:
`DRAFT -> INTERNAL_REVIEW -> CLAIMS_REVIEW -> OWNER_REVIEW -> APPROVED -> PUBLISHED -> RETIRED -> ARCHIVED`

Not every asset must pass every intermediate state, but `APPROVED` must be explicit before external publication unless an approved low-risk fast-path exists.

`PUBLISHED` means externally used and must point to the exact approved master/version.

Never overwrite an approved/published master in place. Create a new version and record `supersedes_asset_id`.

## 6. Naming convention
Human-readable file name:
`<ASSET_ID>_<PRODUCT-or-TOPIC>_<TYPE>_<LANG>_vNN_<STATUS>.<ext>`

Example:
`ASC-ST-VID-0042_SLEEP-TAPE_30SEC_EN_v03_APPROVED.mp4`

Avoid file names such as `final_final2_new.mp4`.

Asset ID is immutable; version changes are explicit.

## 7. Source-of-truth rules
- Claims/evidence wording source: canonical GitHub Product Knowledge / research object.
- Packaging source: approved packaging/label master in Product asset structure.
- Public creative source: APPROVED master only.
- Website/app implementation source: GitHub structured copy/field map plus referenced approved visual/media asset IDs.
- CS source: canonical Product Knowledge + approved operational FAQ, not marketing artwork.

When text is exported from GitHub into Drive for designers, the export is a working derivative, not a new source of truth.

## 8. Language / localisation control
Traditional Chinese, Simplified Chinese and English assets should share a common concept/master ID family but have separate language asset IDs or versions.

Translation approval must not silently inherit claims approval when meaning changes materially. Medical/health claims require language-specific review where necessary.

## 9. Publication gate
Before publishing any product/marketing asset, verify:
1. correct product/SKU/version;
2. current approved claim wording;
3. mandatory safety/caution text present where required;
4. language correct;
5. usage rights cleared;
6. no outdated price/pack/offer unless deliberately dynamic;
7. owner/claims approval status satisfied;
8. publication destination recorded;
9. campaign/creative ID recorded for measurement where applicable.

## 10. Retention / archive model
`HOT`: active working files/current campaigns/current products.
`WARM`: recently completed, reusable masters and source material.
`COLD ARCHIVE`: superseded campaign projects, retired packaging, old raw footage and old exports.

Archive must preserve metadata and retrieval path. Do not delete simply because an asset is no longer current if it supports compliance/history/rights/learning.

Large raw/video files can be moved to lower-cost storage later; metadata remains searchable.

## 11. Access model
- Owner/Amanda: cross-functional visibility and governance.
- Product/Regulatory: source/safety/claims/packaging areas.
- Marketing: approved product facts + marketing working areas; no unrestricted finance/customer data.
- CS: approved FAQ/product-use/support assets.
- Operations: fulfilment/packaging/logistics assets.
- External designer/editor: project-specific working folders only, minimum access.

Public/published folders must not expose internal supplier, customer or confidential operating documents.

## 12. Minimum asset registry for launch
Launch does not require a heavyweight DAM system. A structured Sheet/database table is enough initially if it enforces the metadata and version/status rules.

Minimum launch registry views:
- Product masters by SKU
- Packaging/label approval
- Website/app visual assets
- Marketing approved/published assets
- Video/audio masters
- Rights/expiry review queue
- Retired/superseded assets

## 13. Backup / continuity
At minimum:
- Drive/provider native version history where available;
- periodic export/backup of critical approved masters and registry;
- GitHub remains independent source for structured product/spec/decision text;
- production CDN/object-store media should be reproducible from an approved master, not become the only copy.

Critical launch assets must not exist only on one laptop, WhatsApp thread or chat attachment.

## 14. Immediate implementation without owner interruption
Amanda can proceed now with:
1. create the canonical asset registry schema/spec;
2. tag all new Amanda-created media briefs/scripts with planned asset IDs;
3. reference Product Knowledge Object source paths from future creative briefs;
4. require Rex website/app tickets to reference asset IDs rather than ambiguous file names.

## 15. Owner/external setup only when gating
Owner action is needed only when:
- choosing/authorising the actual shared Drive/account/storage destination;
- granting staff/vendor access;
- approving paid DAM/storage tooling if ever needed;
- approving deletion/retention exceptions for regulated or sensitive material.

Until then Amanda should keep the logical structure and metadata rules ready and avoid blocking other launch work.

## 16. Launch acceptance tests
1. Given one published product image, a staff member can identify the exact approved source/version and product SKU.
2. A superseded packaging label cannot be mistaken for the current approved master.
3. A marketing asset can be traced to its approved Product Knowledge/claims source.
4. EN/ZH-HK/ZH-CN variants are distinguishable and independently reviewable.
5. A published video can be found by campaign, product, language, version and channel.
6. Retiring an asset preserves the historical record but removes it from current-use views.
7. External collaborators cannot browse unrelated company/customer/finance files.
8. Loss of a local machine does not destroy the only master copy of a launch-critical asset.

## 17. Next Amanda step
Create `DIGITAL_ASSET_REGISTRY_SCHEMA_V1` with exact fields, controlled enums and launch examples for Sleep Tape and magnesium; then connect media briefs and future Rex implementation tickets to those asset IDs.