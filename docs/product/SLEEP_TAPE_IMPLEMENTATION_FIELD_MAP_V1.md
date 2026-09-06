# Sleep Tape Implementation Field Map V1

Owner: Amanda
Status: IMPLEMENTATION-READY CONTENT MAP / FINAL COMMERCIAL FIELDS PENDING
Source of truth: `SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md`

## Purpose
Translate the approved Sleep Tape knowledge object into concrete website, catalogue, CS and app fields without duplicating or weakening its safety/claims boundaries. Rex should implement against this map rather than inventing copy or product logic.

## 1. Existing Product model mapping
| Existing field | Sleep Tape value / rule |
|---|---|
| `code` | stable launch code to be confirmed; do not use display name as identity |
| `name` | `Sleep Tape` for English catalogue; localisation must use locale content, not overwrite canonical identity |
| `description` | short safe product summary; no OSA/snoring treatment claim |
| `category` | sleep-support / routine accessory category |
| `imageUrl` | final approved pack/product asset; placeholder allowed only if clearly non-production |
| `priceCents` | PENDING final commercial decision |
| `currency` | GBP under UK-first assumption |
| `active` | false/not sellable until launch gate passes; do not confuse content visibility with sellability |
| `market` | UK initially unless owner changes launch geography |
| `lifecycleState` | COMING_SOON until stock/commercial launch gate, then ACTIVE |

Do not overload `description` with the entire Product Knowledge Object. Structured launch content needs a companion content representation or CMS fields.

## 2. Product-page required content fields
Recommended provider/CMS-neutral field keys:
- `hero_title`: A gentle bedtime cue for suitable nasal breathers.
- `hero_summary`: safe short explanation from canonical object.
- `product_role`: behavioural/routine accessory; not treatment.
- `value_points[]`: Simple / Connected / Responsible.
- `suitability_intro`: visible before purchase.
- `suitability_requires_comfortable_nasal_breathing`: true.
- `do_not_use[]`.
- `medical_review_cautions[]`.
- `stop_use[]`.
- `how_to_use_steps[]` — DRAFT until final pack/IFU reconciliation.
- `first_use_guidance`.
- `what_to_expect[]`.
- `safety_insert_near_cta` — mandatory.
- `faq[]`.
- `delivery_summary` — pending fulfilment policy.
- `returns_summary` — pending approved policy/product hygiene classification.
- `membership_activation_summary` — only if commercial entitlement is configured.
- `claims_version` / `knowledge_version`.
- `content_status`: DRAFT / REVIEWED / APPROVED / RETIRED.

## 3. Mandatory CTA order
For a first-time mobile visitor:
1. Understand what it is.
2. See suitability/safety boundary.
3. See price/pack/delivery when known.
4. Primary CTA `Add to cart` only when sellable.
5. Secondary CTA `Is Sleep Tape suitable for me?`.

Do not require app login to view the product or safety information.

Coming-soon state must not show a working purchase CTA. It may capture interest/launch notification only when consent handling is implemented.

## 4. Mandatory safety insert
Near the purchase CTA, not buried in FAQ:

`Only use if you can breathe comfortably through your nose. Do not use it to self-treat sleep apnoea or breathing problems. Stop and remove it if breathing feels restricted or you become uncomfortable.`

This is a content requirement, not optional marketing copy.

## 5. Claim rendering rules
### GREEN
May render after ordinary final content review:
- gentle physical cue;
- bedtime-routine support;
- suitable adults who can breathe comfortably through the nose;
- verified physical/material facts.

### AMBER
CMS/content status must prevent accidental publication until substantiated/approved:
- dry-mouth improvement;
- encourages nasal breathing;
- comfort/adherence;
- skin-sensitivity/material claims.

### RED
Must not exist in publishable product/marketing fields under current evidence position:
- treats/prevents/cures OSA;
- replaces CPAP/oral appliance;
- treats snoring;
- improves oxygen saturation;
- guarantees deep sleep/REM/sleep quality;
- cardiovascular/jawline claims;
- clinically proven general sleep treatment;
- safe for everyone.

## 6. FAQ object shape
Each FAQ should carry:
- `faq_id`
- `question`
- `answer`
- `locale`
- `knowledge_version`
- `safety_class`: STANDARD / SAFETY / CLINICAL_SIGNPOST
- `publish_status`

Initial canonical FAQ topics:
`what_it_does`, `snoring`, `sleep_apnoea`, `blocked_nose`, `anxiety_or_breathing`, `nightly_use`, `rash`, `evidence`.

Website and CS should consume the same approved answer source where possible.

## 7. CS knowledge fields
Each approved CS response rule needs:
- trigger/topic;
- approved response;
- prohibited advice;
- escalation type;
- related SKU/product;
- lot capture required?;
- order capture required?;
- severity default;
- knowledge version.

Safety-sensitive cases (`cannot breathe`, significant allergy/swelling, OSA/CPAP replacement request) must route through the approved safety escalation logic rather than a generic sales response.

Skin irritation/product defect cases should capture Product + lot/batch when available, linking later to `CSCase` / `CommerceException` from the commerce schema delta.

## 8. App / Sleep Intelligence fields
Do not use a generic `recommended=true` flag alone. Recommendation presentation requires:
- mouth-opening concern signal;
- comfortable nasal breathing signal;
- current congestion/obstruction absent;
- OSA/sleep-disordered-breathing red flags absent;
- intolerance/skin issue absent or appropriately resolved;
- recommendation confidence/reason;
- safety explanation shown;
- knowledge version.

Snoring alone must never trigger Sleep Tape recommendation.

Outcome log fields for this product:
- used/not used;
- comfortable/uncomfortable;
- stayed on/removed;
- perceived morning mouth dryness change;
- perceived sleep disruption;
- skin irritation;
- discontinuation reason.

These are subjective product-use outcomes, not diagnostic OSA outcome fields.

## 9. Physical-product / activation bridge
Existing `ActivationCode`, `ProductOwnership`, `Membership`, `Entitlement` architecture should be reused.

Implementation rule:
- physical purchase and QR redemption are separate events;
- QR can grant the configured digital entitlement/membership once the commercial rule is approved;
- entitlement must not be inferred merely because the product page was viewed or added to cart;
- offline/distributor QR activation remains possible without requiring an owned-site Order.

## 10. Commercial fields still genuinely blocked
Do not invent:
- final product code/SKU/barcode;
- pack count;
- exact dimensions/geometry if not supplier-locked;
- substrate/adhesive specification;
- latex/material claims;
- shelf life/storage;
- final price;
- tax class/VAT treatment;
- stock quantity/date;
- final shipping promise;
- returns eligibility for opened/used product;
- final QR entitlement duration;
- final legal/regulatory claim approval.

These fields should be nullable/draftable so implementation can proceed without publishing false data.

## 11. Implementation acceptance tests
1. Mobile visitor can understand role + safety before purchase without login.
2. COMING_SOON product cannot accidentally create a purchasable order.
3. CTA safety insert is visible in the purchase decision area.
4. RED claim text is absent from product/FAQ/marketing fixtures.
5. AMBER claim cannot be published when status is unapproved.
6. FAQ/CS answers expose a knowledge version so updates are traceable.
7. Snoring-only test scenario does not recommend Sleep Tape.
8. Blocked-nose/OSA-red-flag scenario suppresses recommendation and shows safety/clinical route.
9. QR activation uses existing entitlement service boundaries.
10. Missing pack/price/material fields render honest pending/coming-soon behaviour rather than fabricated values.

## 12. Engineering boundary
Amanda has completed the content-to-field translation. Rex should not redesign the product proposition or claims logic while implementing it. Engineering work should focus on reusable structured content rendering, catalogue/commerce state, safety visibility, localisation, and tests.

No Edmund decision is required to preserve these rules. Owner/supplier/legal decisions are required only for the commercial fields listed in section 10 before live sale/publication.
