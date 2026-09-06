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

Checkpoint completed 2026-09-06:
- nine launch gates defined across product/commercial definition, website, payment, canonical order lifecycle, fulfilment, CS, marketing, CRM/reporting and digital assets;
- fulfilment routes/data contract, consumable traceability requirements, diligence questionnaire and acceptance tests defined;
- commerce exception severity P0-P3, operational triggers/actions/owners/escalations and role permissions defined;
- canonical vendor-independent commerce data model defined across customer/consent, product/SKU, order/payment, inventory, fulfilment, return, CS, exceptions, attribution and activation;
- existing Prisma schema reconciled against the canonical model: User, ConsentRecord, Product, ProductOwnership, Membership, Entitlement, ActivationCode, AuditLog and AnalyticsEvent are explicitly reused rather than duplicated;
- minimum missing transactional layer scoped: Order/OrderItem/OrderEvent, Payment/Refund, InventoryPosition/Lot, Fulfilment/Shipment, Return, CSCase and CommerceException;
- implementation divided into small C1-C6 slices, keeping provider adapters last and preventing premature ERP/provider lock-in;
- ten pre-provider tests defined including duplicate webhook/idempotency, stranded paid order, no fulfilment on failed payment, historical price snapshots, refund replay, inventory oversell and lot-recall traceability.

Next:
- prepare precise Rex engineering ticket for commerce C1 only when implementation capacity is appropriate;
- continue launch content/CS preparation while final commercial/provider decisions remain non-gating;
- obtain/compare vendor quotes only when commercial outreach or stock timing makes the decision gating.

### 2. Product Knowledge / Website Content — WORKING
Visible artifacts:
- `docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md`
- `docs/product/SLEEP_TAPE_IMPLEMENTATION_FIELD_MAP_V1.md`
Checkpoint:
- canonical product truth, suitability/safety screen, claims policy, website copy, FAQ/CS matrix, Intelligence bridge and Growth atom exist;
- knowledge has now been translated into concrete existing-Product fields plus provider/CMS-neutral product-page, FAQ, CS, app/Intelligence and activation fields;
- mandatory near-CTA safety insert and GREEN/AMBER/RED publication rules are implementation requirements;
- missing pack/material/price/tax/stock/returns/entitlement facts are explicitly nullable/draftable and must not be invented;
- ten implementation acceptance tests defined, including coming-soon no-purchase, red-claim absence, amber publication gate and snoring-only recommendation suppression.
Important launch dependencies: final SKU/material/adhesive specification, pack IFU/count/barcode/price, stock/shipping/returns rules and final legal/regulatory/claims approval.
Next visible output: magnesium Product Knowledge Object after launch-critical implementation handoff is sufficiently scoped.

### 3. Growth / Video Production Pipeline — WORKING
Pipeline: research/product signal -> core message -> short -> explainer -> founder/product outline -> storyboard -> voice/subtitle -> variants -> publish gate -> measurement.
Checkpoint: first Sleep Tape master marketing atom exists using “Use a cue, not a cure.”
Next visible output: production-ready short/explainer/storyboard package after claims gate is locked.

### 4. Sleep Intelligence V1 — WORKING
Visible artifacts:
- `docs/product/ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md`
- `docs/product/SLEEP_INTELLIGENCE_RESEARCH_REGISTRY_V1.md`
Current step: evidence -> question -> signal/tag -> confidence -> strategy -> action -> outcome mapping, with safety/corroboration gates.
Checkpoint: Sleep Tape recommendation logic defined; snoring alone cannot trigger recommendation; obstruction/OSA red flags suppress product recommendation and route to safety/clinical guidance.

### 5. Amanda OS V1 — WORKING
Visible artifact:
- `docs/company/AMANDA_OS_V1.md`
Commerce permission/exception layer, canonical reporting map and existing-schema delta are now inspectable.
Next: decision-log format after launch handoff work.

### 6. Google Drive / Digital Asset Structure — QUEUED / NEEDS SETUP
Target: Research / Product / Marketing / Video / Audio-Voice / Brand Assets / Published / Archive.
Rule: GitHub for structured/versioned text and specs; Drive/object storage for production media; database for dynamic operational/user data.

## Rex work — monitored separately
Rex implementation should follow business-readiness priority: commerce/product pages and customer reliability before non-critical cosmetic app polish. Amanda prepares thinking-heavy strategy/research/content first to reduce Rex token use.

## Owner visibility rule
Meaningful milestone report: WHAT CHANGED / WHERE TO SEE IT / WHAT TO REVIEW / NEXT STEP / STATUS.

## Today — active checkpoint
- DONE: Amanda OS V1 baseline.
- DONE: Sleep Intelligence research-registry skeleton.
- DONE: Amanda live PMO tracker.
- DONE: business-launch-first reprioritisation.
- DONE: Launch Readiness Map V1.
- DONE: Sleep Tape Product Knowledge Object V1.
- DONE: Fulfilment Decision Matrix V1.
- DONE: Commerce Exception / Alert / Permission Model V1.
- DONE: Canonical Commerce Data & Reporting Map V1.
- DONE: existing Prisma commerce-schema reconciliation + scoped engineering delta.
- DONE: Sleep Tape implementation field map for website/CS/app/activation.
- WORKING: next launch-content/product-knowledge object.
- WORKING: evidence -> scenario / corroboration / behavioural strategy mapping.
- WORKING: marketing/video output structure derived from research/product content.
- NEXT: Google Drive digital-asset folder/metadata plan.
