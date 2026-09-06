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

Checkpoint completed 2026-09-06:
- nine launch gates defined across product/commercial definition, website, payment, canonical order lifecycle, fulfilment, CS, marketing, CRM/reporting and digital assets;
- each gate separates BUILD NOW vs external/owner dependency vs launch acceptance gate;
- canonical order and exception states defined;
- minimum operational data objects and owner dashboard defined;
- owner decisions grouped so Amanda can continue autonomously until a decision is genuinely gating;
- explicitly deferred non-critical app polish and premature heavyweight ERP work;
- real UK fulfilment routes researched and compared: ShipBob UK, Amazon MCF/FBA and Huboo;
- provisional launch route set: specialist UK 3PL primary, ShipBob current lead diligence candidate, Amazon MCF fallback/hybrid, Huboo alternative quote;
- vendor-independent fulfilment request/event data contract defined;
- supplement-critical lot/batch, expiry, FEFO, recall and return controls promoted to non-negotiable requirements;
- 35-point quote/diligence questionnaire and end-to-end fulfilment acceptance test defined;
- commerce exception severity P0-P3, operational triggers/actions/owners/escalations, immutable exception object and role-based permission boundaries defined;
- owner dashboard converted to exception-first model with money/order/stock/customer/growth panels;
- bounded retry/idempotency, no-double-refund, no-auto-claim/no-auto-spend safety rules and eight launch acceptance tests defined.

Next:
- map exception model into canonical CRM/order/reporting fields;
- convert approved Sleep Tape knowledge into implementation-ready product-page/CS fields;
- obtain/compare vendor quotes only when commercial outreach or stock timing makes the decision gating.

### 2. Product Knowledge / Website Content — WORKING
Visible artifact:
- `docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md`
Checkpoint: canonical product truth, suitability/safety screen, claims policy, website copy, FAQ/CS matrix, Intelligence bridge, first Growth atom and implementation YAML exist.
Important launch dependencies: final SKU materials, adhesive/substrate specification, pack IFU, pack size/barcode/price, final legal/regulatory/claims approval.
Next visible output: implementation-ready website/CS field map, then magnesium Product Knowledge Object.

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
- commerce permission/exception layer now inspectable in `COMMERCE_EXCEPTION_ALERT_PERMISSION_MODEL_V1.md`.
Next: canonical CRM/order/report field map + decision-log format.

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
- WORKING: canonical CRM/order/report field map.
- WORKING: evidence -> scenario / corroboration / behavioural strategy mapping.
- WORKING: marketing/video output structure derived from research/product content.
- NEXT: Google Drive digital-asset folder/metadata plan.
