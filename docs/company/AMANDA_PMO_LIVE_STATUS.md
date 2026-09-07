# Amanda PMO — Live Status

Last owner-approved operating mode: 2026-09-06
Status: ACTIVE

Purpose: make Amanda's own work visible between conversations. A workstream may only be marked WORKING when there is inspectable progress.

## CURRENT COMPANY PRIORITY — BUSINESS LAUNCH FIRST
Target: once stock is physically ready, Asclepios can immediately sell, fulfil, support and market without waiting months for infrastructure.

Canonical chain:
PRODUCT READY -> WEBSITE READY -> PAYMENT READY -> ORDER FLOW READY -> FULFILMENT READY -> CS READY -> MARKETING READY -> LAUNCH

## Current Amanda workstreams

### 1. Commerce / Business Launch Readiness — WORKING / TOP PRIORITY
Visible artifacts:
- `docs/company/LAUNCH_READINESS_MAP_V1.md`
- `docs/company/FULFILMENT_DECISION_MATRIX_V1.md`
- `docs/company/COMMERCE_EXCEPTION_ALERT_PERMISSION_MODEL_V1.md`
- `docs/company/CANONICAL_COMMERCE_DATA_REPORTING_MAP_V1.md`
- `docs/company/COMMERCE_EXISTING_SCHEMA_DELTA_V1.md`
- `docs/company/COMMERCE_C1_SCHEMA_IMPLEMENTATION_SPEC_V1.md`
- `docs/company/LAUNCH_CUSTOMER_SERVICE_OPERATING_PACKAGE_V1.md`
- `docs/company/CS_KNOWLEDGE_MACRO_SCHEMA_V1.md`

Checkpoint completed through 2026-09-07:
- nine launch gates defined across product/commercial definition, website, payment, canonical order lifecycle, fulfilment, CS, marketing, CRM/reporting and digital assets;
- fulfilment routes/data contract, consumable traceability requirements, diligence questionnaire and acceptance tests defined;
- commerce exception severity P0-P3, operational triggers/actions/owners/escalations and role permissions defined;
- canonical vendor-independent commerce data model defined across customer/consent, product/SKU, order/payment, inventory, fulfilment, return, CS, exceptions, attribution and activation;
- existing Prisma schema reconciled against the canonical model and missing transactional layer scoped;
- C1 schema implementation spec now defines exact additive Order/OrderItem/OrderEvent/Payment/Refund persistence boundary, state vocabularies, indexes/idempotency, migration/parity rules, ten verification tests and Definition of Done without choosing a payment provider;
- implementation remains divided into C1-C6 slices and pre-provider tests defined;
- launch CS operating model and controlled macro schema defined;
- first Sleep Tape launch media package now exists before stock arrival, advancing Marketing Gate 7 without waiting for production media.

Next:
- keep C1 ready for Rex when engineering capacity is assigned; no further strategy processing should be charged to Rex for this slice;
- continue launch content/CS/marketing preparation while final commercial/provider decisions remain non-gating;
- obtain/compare vendor quotes only when commercial outreach or stock timing makes the decision gating;
- keep final shipping/returns/refund/support-channel facts configurable and PENDING until approved rather than inventing them.

### 2. Product Knowledge / Website Content — WORKING
Visible artifacts:
- `docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md`
- `docs/product/SLEEP_TAPE_IMPLEMENTATION_FIELD_MAP_V1.md`
- `docs/product/MAGNESIUM_PRODUCT_KNOWLEDGE_OBJECT_V1.md`
Checkpoint: Sleep Tape canonical truth + implementation fields exist; magnesium pre-formulation object exists with unknown formulation/label facts explicitly pending.
Important dependencies: final SKU/material/pack/barcode/price/formulation/label/claims facts.
Next: populate only from verified supplier facts; otherwise continue unblocked launch work.

### 3. Customer Service / Launch Support — WORKING / CHECKPOINT COMPLETE
Visible artifacts:
- `docs/company/LAUNCH_CUSTOMER_SERVICE_OPERATING_PACKAGE_V1.md`
- `docs/company/CS_KNOWLEDGE_MACRO_SCHEMA_V1.md`
Checkpoint: taxonomy, CSCase data, P0-P3 escalation, verification, controlled product/safety/commerce macros, AI boundary and acceptance tests defined.
Next: final product macros only when verified formula/label facts exist; expose approved help objects when implementation surfaces are ready.

### 4. Growth / Video Production Pipeline — WORKING / MAJOR CHECKPOINT
Visible artifact:
- `docs/marketing/SLEEP_TAPE_LAUNCH_MEDIA_PACKAGE_V1.md`

Checkpoint completed 2026-09-07:
- campaign spine locked to “Use a cue, not a cure”;
- three production-ready 20–30 sec short scripts defined;
- 55-sec explainer script defined;
- 2–3 minute founder/product outline defined;
- storyboard master, visual guardrails, caption/subtitle master and five social/FAQ responses defined;
- planned immutable asset IDs reserved in line with digital-asset governance;
- channel variants and measurement fields defined;
- paid advertising remains held behind claims/legal/channel-policy gate;
- safety messaging must remain inside video rather than being hidden only in captions.

Next visible output:
- register/produce actual media assets when production tooling/final product imagery is ready;
- derive launch education/creative from magnesium only after final formulation facts support it;
- continue non-product-fact-dependent marketing architecture rather than inventing claims.

### 5. Sleep Intelligence V1 — WORKING
Visible artifacts:
- `docs/product/ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md`
- `docs/product/SLEEP_INTELLIGENCE_RESEARCH_REGISTRY_V1.md`
Current step: evidence -> question -> signal/tag -> confidence -> strategy -> action -> outcome mapping, with safety/corroboration gates.
Checkpoint: Sleep Tape recommendation logic and magnesium recommendation boundary defined.

### 6. Amanda OS V1 — WORKING
Visible artifact: `docs/company/AMANDA_OS_V1.md`
Commerce, CS, asset-governance and launch-media operating layers are inspectable.
Next: decision-log format after launch handoff work.

### 7. Digital Asset Structure — WORKING / CHECKPOINT COMPLETE
Visible artifacts:
- `docs/company/DIGITAL_ASSET_STRUCTURE_METADATA_PLAN_V1.md`
- `docs/company/DIGITAL_ASSET_REGISTRY_SCHEMA_V1.md`
Checkpoint: roots/folders, immutable IDs, metadata, status/version/rights/claims, localisation, archive/access model and lightweight launch registry defined. Sleep Tape media package now consumes planned asset IDs.
Next: physical Drive/registry setup only when approved shared destination exists; do not block launch.

## Rex work — monitored separately
Rex implementation should follow business-readiness priority: commerce/product pages and customer reliability before non-critical cosmetic app polish. Amanda prepares thinking-heavy strategy/research/content first to reduce Rex token use.

## Owner visibility rule
Meaningful milestone report: WHAT CHANGED / WHERE TO SEE IT / WHAT TO REVIEW / NEXT STEP / STATUS.

## Today — active checkpoint
- DONE: Amanda OS V1 baseline.
- DONE: Sleep Intelligence research-registry skeleton.
- DONE: business-launch-first reprioritisation and Launch Readiness Map V1.
- DONE: Sleep Tape Product Knowledge Object + implementation field map.
- DONE: Fulfilment Decision Matrix V1.
- DONE: Commerce Exception / Alert / Permission Model V1.
- DONE: Canonical Commerce Data & Reporting Map + existing-schema delta.
- DONE: Commerce C1 Schema Implementation Spec V1 — exact schema-only handoff ready for Rex without provider choice.
- DONE: Magnesium Product Knowledge Object V1 pre-formulation checkpoint.
- DONE: Digital Asset Structure + Registry Schema V1.
- DONE: Launch Customer Service Operating Package + CS Macro Schema V1.
- DONE: Sleep Tape Launch Media Package V1 — 3 shorts, explainer, founder outline, storyboard, captions, channel/measurement/claims gates.
- WORKING: product-knowledge completion from verified supplier facts.
- WORKING: evidence -> scenario / corroboration / behavioural strategy mapping.
- NEXT: continue highest-value unblocked launch preparation; C1 is implementation-ready while production assets and product-specific claims remain gated by verified final facts.
