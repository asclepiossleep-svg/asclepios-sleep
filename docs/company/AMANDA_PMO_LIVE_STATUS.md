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
- `docs/company/LAUNCH_CUSTOMER_SERVICE_OPERATING_PACKAGE_V1.md`
- `docs/company/CS_KNOWLEDGE_MACRO_SCHEMA_V1.md`

Checkpoint completed through 2026-09-07:
- nine launch gates defined across product/commercial definition, website, payment, canonical order lifecycle, fulfilment, CS, marketing, CRM/reporting and digital assets;
- fulfilment routes/data contract, consumable traceability requirements, diligence questionnaire and acceptance tests defined;
- commerce exception severity P0-P3, operational triggers/actions/owners/escalations and role permissions defined;
- canonical vendor-independent commerce data model defined across customer/consent, product/SKU, order/payment, inventory, fulfilment, return, CS, exceptions, attribution and activation;
- existing Prisma schema reconciled against the canonical model and missing transactional layer scoped;
- implementation divided into C1-C6 slices and pre-provider tests defined;
- launch CS operating model now defined across product/pre-sale/use/safety, payment, order, fulfilment, lost/damaged, cancellation, return/refund, activation, app, complaint and privacy cases;
- CSCase minimum record, severity/escalation, verification, source hierarchy, AI first-line support boundary and feedback loop defined;
- Sleep Tape safety/product macros plus commerce/payment/fulfilment/activation macro schema created with source traceability, draft/approved/retired control and locked P0 wording.

Next:
- continue launch content/CS preparation while final commercial/provider decisions remain non-gating;
- prepare precise Rex engineering ticket for commerce C1 only when implementation capacity is appropriate;
- obtain/compare vendor quotes only when commercial outreach or stock timing makes the decision gating;
- keep final shipping/returns/refund/support-channel facts configurable and PENDING until approved rather than inventing them.

### 2. Product Knowledge / Website Content — WORKING
Visible artifacts:
- `docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md`
- `docs/product/SLEEP_TAPE_IMPLEMENTATION_FIELD_MAP_V1.md`
- `docs/product/MAGNESIUM_PRODUCT_KNOWLEDGE_OBJECT_V1.md`

Checkpoint:
- Sleep Tape canonical product truth, suitability/safety screen, claims policy, website copy, FAQ/CS matrix, Intelligence bridge and Growth atom exist;
- Sleep Tape knowledge translated into implementation fields and launch CS macros;
- magnesium pre-formulation Product Knowledge Object exists with explicit non-treatment positioning, safety/caution framework and pending formula/label facts.

Important launch dependencies: final Sleep Tape SKU/material/adhesive specification, pack IFU/count/barcode/price; final magnesium form(s), elemental magnesium/dose, full ingredients, label/pack/price; stock/shipping/returns rules; final legal/regulatory/claims approval.

Next visible output:
- populate magnesium formulation fields from approved supplier/product catalogue when available;
- prepare probiotic/gut-brain Product Knowledge Object when sufficient source facts exist;
- otherwise continue unblocked launch assets/CS/marketing work without inventing product facts.

### 3. Customer Service / Launch Support — WORKING / CHECKPOINT COMPLETE
Visible artifacts:
- `docs/company/LAUNCH_CUSTOMER_SERVICE_OPERATING_PACKAGE_V1.md`
- `docs/company/CS_KNOWLEDGE_MACRO_SCHEMA_V1.md`

Checkpoint completed 2026-09-07:
- full launch contact taxonomy and CSCase state/data model defined;
- P0-P3 support severity aligned with commerce exception model;
- order/customer verification and least-privilege rules defined;
- Sleep Tape controlled product/safety responses derived from canonical Product Knowledge;
- payment/order/fulfilment/lost-damaged/cancellation/return/refund/activation operating rules defined without provider-specific fabrication;
- AI first-line support allowed/prohibited actions defined, with locked deterministic P0 safety handling preferred;
- reusable macro schema defined with source refs, versions, status lifecycle, language, severity, response mode, internal/prohibited actions and escalation;
- core Sleep Tape + commerce launch macros drafted, while return-policy macro intentionally remains draft until approved policy exists;
- 12 launch acceptance tests defined.

Next:
- add final magnesium macros only when final formula/label facts are verified;
- expose approved CS/help objects to implementation when commerce/order surfaces are ready;
- final support inbox, shipping SLA, return/refund policy and provider escalation contacts remain grouped launch dependencies.

### 4. Growth / Video Production Pipeline — WORKING
Pipeline: research/product signal -> core message -> short -> explainer -> founder/product outline -> storyboard -> voice/subtitle -> variants -> publish gate -> measurement.
Checkpoint:
- Sleep Tape master marketing atom exists using “Use a cue, not a cure.”
- Magnesium pre-formulation marketing atom exists.
- digital asset governance now defines immutable asset IDs, status/version control, claims/rights gates and channel/publication traceability for future media production.
- CS feedback loop now creates a governed route from repeated customer questions to Product/Growth insight without automatically creating efficacy claims.
Next visible output: production-ready media briefs/scripts tied to canonical asset IDs once product-specific claims gates are sufficiently locked.

### 5. Sleep Intelligence V1 — WORKING
Visible artifacts:
- `docs/product/ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md`
- `docs/product/SLEEP_INTELLIGENCE_RESEARCH_REGISTRY_V1.md`
Current step: evidence -> question -> signal/tag -> confidence -> strategy -> action -> outcome mapping, with safety/corroboration gates.
Checkpoint:
- Sleep Tape recommendation logic defined with safety suppression rules.
- Magnesium recommendation boundary defined without inferring deficiency or over-claiming.

### 6. Amanda OS V1 — WORKING
Visible artifact:
- `docs/company/AMANDA_OS_V1.md`
Commerce permission/exception layer, canonical reporting map, existing-schema delta, CS operating layer and asset-governance layer are inspectable.
Next: decision-log format after launch handoff work.

### 7. Digital Asset Structure — WORKING / CHECKPOINT COMPLETE
Visible artifacts:
- `docs/company/DIGITAL_ASSET_STRUCTURE_METADATA_PLAN_V1.md`
- `docs/company/DIGITAL_ASSET_REGISTRY_SCHEMA_V1.md`

Checkpoint completed 2026-09-06:
- canonical Asclepios and separate RockPillar asset roots defined;
- Research/Product/Brand/Website-App/Marketing/Video/Audio/CS/Operations/Published/Archive folder logic defined;
- product/SKU and campaign/media substructures defined;
- mandatory metadata, immutable asset IDs, controlled status/version/rights/claims fields and publication gates defined;
- EN/ZH-HK/ZH-CN localisation controls defined;
- HOT/WARM/COLD archive and minimum access model defined;
- launch can begin with a lightweight registry rather than a heavyweight DAM;
- exact registry schema, controlled enums, sample Sleep Tape/magnesium rows, validation rules and minimum launch views defined;
- custom DAM implementation explicitly deferred until volume/workflow complexity justifies it.

Next:
- use planned asset IDs in new marketing/video briefs and Rex media implementation tickets;
- create actual shared Drive folders/registry only when the approved shared Drive/account destination is available;
- do not block launch work on physical folder creation.

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
- DONE: Sleep Tape implementation field map.
- DONE: Magnesium Product Knowledge Object V1 pre-formulation checkpoint.
- DONE: Digital Asset Structure & Metadata Plan V1.
- DONE: Digital Asset Registry Schema V1.
- DONE: Launch Customer Service Operating Package V1.
- DONE: CS Knowledge & Macro Schema V1 with initial launch macros.
- WORKING: product-knowledge completion from verified supplier facts.
- WORKING: evidence -> scenario / corroboration / behavioural strategy mapping.
- WORKING: marketing/video output structure derived from research/product content.
- NEXT: production-ready Sleep Tape launch media brief or probiotic product object when verified facts are sufficient.
