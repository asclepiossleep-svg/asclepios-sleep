# Digital Asset Registry Schema V1

Owner: Amanda
Status: IMPLEMENTATION-READY SPEC

## Purpose
Define the minimum structured registry required to control Asclepios/RockPillar production assets before a dedicated DAM is justified.

A Google Sheet, lightweight database table or equivalent may implement this schema initially.

## Core fields
| Field | Type | Required | Controlled rule |
|---|---|---:|---|
| asset_id | string | yes | immutable unique ID |
| asset_family_id | string | yes | groups language/channel/version variants |
| title | string | yes | human-readable |
| company | enum | yes | ASCLEPIOS / ROCKPILLAR |
| asset_type | enum | yes | see enums |
| product_code | string | conditional | required for product-specific asset |
| sku | string | optional | exact commercial SKU when known |
| campaign_id | string | optional | required for campaign creative |
| topic | string | yes | controlled topic/tag |
| language | enum | yes | EN / ZH-HK / ZH-CN / MULTI / N-A |
| market | string | optional | e.g. UK, HK, GLOBAL |
| channel | enum | optional | WEBSITE / APP / AMAZON / META / INSTAGRAM / TIKTOK / YOUTUBE / EMAIL / CS / PRINT / INTERNAL / OTHER |
| version | integer | yes | starts at 1, monotonically increases inside family |
| status | enum | yes | controlled workflow state |
| owner_role | string | yes | accountable role |
| created_at | datetime | yes | ISO timestamp/date |
| updated_at | datetime | yes | ISO timestamp/date |
| approved_at | datetime | optional | required when APPROVED/PUBLISHED |
| approved_by | string | optional | owner/authorised role |
| source_ref | string | optional | GitHub path/research/product source |
| claims_status | enum | optional | NOT_APPLICABLE / DRAFT / APPROVED / RESTRICTED / BLOCKED |
| rights_status | enum | yes | OWNED / LICENSED / THIRD_PARTY_APPROVED / PENDING / RESTRICTED |
| rights_expiry | date | optional | if licence expires |
| review_due | date | optional | claims/rights/product refresh date |
| supersedes_asset_id | string | optional | previous asset |
| file_location | string | yes | Drive/object-store path/reference |
| published_location | string | optional | production/public destination |
| archive_class | enum | yes | HOT / WARM / COLD |
| checksum | string | optional | recommended for final masters |
| notes | string | optional | concise operational note |

## Controlled enums
### asset_type
RESEARCH_SOURCE, PRODUCT_SOURCE, PRODUCT_COPY, PACKAGING, LABEL, IMAGE_RAW, IMAGE_MASTER, GRAPHIC, VIDEO_RAW, VIDEO_PROJECT, VIDEO_MASTER, AUDIO_RAW, AUDIO_MASTER, SCRIPT, STORYBOARD, SUBTITLE, CS_ASSET, OPERATIONS_ASSET, WEBSITE_EXPORT, APP_MEDIA, CAMPAIGN_CREATIVE, OTHER.

### status
DRAFT, INTERNAL_REVIEW, CLAIMS_REVIEW, OWNER_REVIEW, APPROVED, PUBLISHED, RETIRED, ARCHIVED.

### claims_status
NOT_APPLICABLE, DRAFT, APPROVED, RESTRICTED, BLOCKED.

### rights_status
OWNED, LICENSED, THIRD_PARTY_APPROVED, PENDING, RESTRICTED.

### archive_class
HOT, WARM, COLD.

## Asset ID convention
Recommended:
`<COMPANY>-<PRODUCT/TOPIC>-<TYPE>-<SERIAL>`

Examples:
- `ASC-ST-IMG-0001`
- `ASC-ST-VID-0001`
- `ASC-MG-PACK-0001`
- `ASC-SI-AUD-0001`

Do not encode mutable version/status/language inside the immutable `asset_id`; those remain separate registry fields. File names may include them for human readability.

## Example launch rows
| asset_id | family | title | product | type | language | version | status | source_ref | claims | rights |
|---|---|---|---|---|---|---:|---|---|---|---|
| ASC-ST-IMG-0001 | ST-HERO-01 | Sleep Tape hero pack image | SLEEP_TAPE | IMAGE_MASTER | MULTI | 1 | DRAFT | docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md | NOT_APPLICABLE | PENDING |
| ASC-ST-SCR-0001 | ST-SHORT-01 | Sleep Tape 30-sec cue-not-cure script | SLEEP_TAPE | SCRIPT | EN | 1 | INTERNAL_REVIEW | docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md | DRAFT | OWNED |
| ASC-MG-SCR-0001 | MG-SHORT-01 | Magnesium supplement role explainer | MAGNESIUM | SCRIPT | EN | 1 | DRAFT | docs/product/MAGNESIUM_PRODUCT_KNOWLEDGE_OBJECT_V1.md | DRAFT | OWNED |
| ASC-ST-PACK-0001 | ST-PACK-01 | Sleep Tape retail pack master | SLEEP_TAPE | PACKAGING | EN | 1 | DRAFT | supplier/packaging source pending | PENDING | OWNED |

These examples intentionally remain DRAFT while pack/formula/claims facts are unresolved.

## Validation rules
1. `PUBLISHED` requires `approved_at`, `approved_by`, `rights_status != PENDING/RESTRICTED`, and `published_location`.
2. Product-specific `APPROVED/PUBLISHED` marketing assets require `source_ref` to canonical Product Knowledge/claims source.
3. `claims_status=BLOCKED` prohibits `APPROVED/PUBLISHED` for claim-bearing assets.
4. `rights_status=PENDING/RESTRICTED` prohibits publication.
5. `RETIRED/ARCHIVED` assets remain searchable but excluded from current-use default views.
6. A new version of an approved asset must not overwrite the previous approved binary/master.
7. Language variants that materially change claim meaning require their own claims review status.

## Minimum launch views
- `CURRENT_APPROVED_MASTERS`: APPROVED/PUBLISHED + not retired.
- `NEEDS_REVIEW`: INTERNAL_REVIEW / CLAIMS_REVIEW / OWNER_REVIEW.
- `BLOCKED_RIGHTS_OR_CLAIMS`: rights pending/restricted or claims blocked.
- `BY_PRODUCT`: group assets by product/SKU.
- `PUBLISHED_BY_CHANNEL`: channel + campaign + version.
- `EXPIRY_REVIEW_QUEUE`: rights_expiry/review_due approaching.
- `SUPERSEDED_RETIRED`: historical traceability.

## Ownership workflow
Creator/working role -> Product/Claims review where applicable -> Owner/authorised approval -> Publisher -> Amanda audit.

Amanda maintains governance rules and cross-functional traceability. Publishing authority remains role-based; external contributors cannot self-approve.

## Implementation boundary
Do not ask Rex to build a custom DAM yet. First implement this registry in the simplest approved shared store and use the IDs in website/app/media tickets. Migrate later only if asset volume/workflow complexity justifies it.