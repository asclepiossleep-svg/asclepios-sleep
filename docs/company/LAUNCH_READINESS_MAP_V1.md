# Asclepios Sleep — Launch Readiness Map V1

Owner: Amanda
Status: WORKING — inspectable checkpoint
Priority: Business launch before non-critical app polish

## Launch objective
Reach a state where physical stock can land and selling can begin without waiting for missing business infrastructure.

Canonical chain:
PRODUCT READY -> WEBSITE READY -> PAYMENT READY -> ORDER FLOW READY -> FULFILMENT READY -> CS READY -> MARKETING READY -> LAUNCH

## Gate 1 — Product / commercial definition
### Build now
- Canonical SKU registry for Sleep Tape, magnesium and gut-brain/probiotic products.
- Product knowledge object per SKU: promise, audience, usage, exclusions/cautions, evidence boundaries, FAQ, CS answers, claims status, pack/variant metadata.
- Pricing placeholders and promotion rules separated from product copy so prices can change without rewriting content.
- Returns/refund eligibility matrix by product class.
### External dependency
- Final pack sizes, landed cost, barcode/SKU identifiers, final regulatory/claims review, stock availability.
### Launch gate
No SKU goes live unless title, price, stock state, fulfilment route, usage, cautions and customer-support answers are populated.

## Gate 2 — Website / conversion path
### Build now
- Home -> product discovery -> product detail -> cart -> checkout -> confirmation -> account/order status.
- Product page template with: what it is; who it is for; how it helps; how to use; what to expect; safety/cautions; FAQ; delivery/returns; related Sleep Intelligence education; clear Add to Cart.
- Mobile-first readability and obvious Back/Close/Cart actions.
- Out-of-stock / coming-soon state that captures interest without pretending an order can be fulfilled.
### External dependency
- Final imagery, final legal/company footer data, production domain configuration where applicable.
### Launch gate
A first-time mobile visitor can understand a product, price, delivery proposition and next action without entering the sleep app or guessing navigation.

## Gate 3 — Payment / checkout
### Build now
- Provider-agnostic checkout contract: basket, currency, shipping address, billing, tax fields, payment status, order ID, receipt, failure/retry, refund state.
- Payment event states: initiated -> authorised -> paid -> failed/cancelled -> partially refunded/refunded.
- Never mark an order fulfilment-ready from browser success alone; server/provider confirmation is required.
### Owner/account dependency
- Payment provider account, merchant/KYC approval, settlement bank, enabled payment methods, live keys, tax/VAT configuration.
### Launch gate
Successful payment creates one canonical paid order; failed/abandoned payment cannot create a fulfilment instruction; customer receives a usable confirmation.

## Gate 4 — Order lifecycle / source of truth
Canonical order states:
DRAFT -> PAYMENT_PENDING -> PAID -> FULFILMENT_QUEUED -> PICKING -> DISPATCHED -> DELIVERED
Exception states: PAYMENT_FAILED, ON_HOLD, CANCELLED, RETURN_REQUESTED, RETURNED, REFUND_PENDING, REFUNDED, LOST/DAMAGED.

### Build now
- One order ID shared across website, payment reference, fulfilment, CS and reporting.
- Immutable event timeline for material order-state changes.
- Exception queue for paid-but-not-queued, fulfilment failure, stale dispatch, delivery exception and refund mismatch.
### External dependency
- Fulfilment/carrier integration details.
### Launch gate
Every paid order has an owner/system responsible for its next state and every exception is visible rather than silently stranded.

## Gate 5 — Fulfilment / logistics
### Build now
Decision matrix comparing:
1. UK 3PL direct-to-consumer.
2. Amazon MCF/FBA where commercially suitable.
3. Hybrid: 3PL for owned-site orders + Amazon inventory/channel.

Score each on: onboarding lead time; minimum volume; receiving/storage; pick-pack; packaging control; UK coverage; international capability; returns; tracking/webhooks/API; Amazon compatibility; SLA; exception handling; per-order economics; inventory reconciliation.

Operational data contract required regardless of provider:
- SKU + quantity
- order ID
- recipient/address/contact
- shipping service
- fulfilment status
- tracking number/carrier
- inventory decrement/adjustment
- exception code
- return receipt/disposition
### Owner decision dependency
- Final fulfilment provider and commercial contract.
### Launch gate
Test order can travel from PAID to tracking/dispatch and inventory reconciles afterward; return path is documented.

## Gate 6 — Customer service
### Build now
- Contact entry point visible from product/order surfaces.
- FAQ/answer library sourced from canonical product knowledge rather than ad-hoc agent answers.
- CS case categories: product/use, pre-sale, payment, order status, delivery, damaged/lost, cancellation, return/refund, account/app, safety/escalation.
- Case record must link customer + order + SKU where applicable.
- Escalation rules for safety, payment dispute, repeated fulfilment failure, regulatory/claims concern and high-value/reputational complaint.
### External dependency
- Final support inbox/channel and staffing/escalation ownership.
### Launch gate
A customer can find support without searching; CS can see the relevant order history and approved product answer; unresolved exceptions have an owner.

## Gate 7 — Marketing launch assets
### Build now
For each launch SKU create a reusable content atom:
RESEARCH/PRODUCT FACT -> CUSTOMER PROBLEM -> SAFE CLAIM -> ACTION -> PRODUCT/EDUCATION BRIDGE -> CTA

Required launch pack per hero SKU:
- product-page copy
- 3 x 20–30 sec shorts
- 1 x 45–60 sec explainer
- 1 x 2–3 min founder/product outline
- captions/subtitle master
- 5 FAQ/social response snippets
- image/storyboard brief
- tracking campaign/creative IDs
### External dependency
- Final pack imagery/video renders and channel accounts/ad spend if paid promotion is used.
### Launch gate
Marketing does not begin from zero on stock-arrival day; approved organic assets are already publishable.

## Gate 8 — CRM / reporting / operating control
### Build now
Minimum entities:
Customer, Consent, Lead, Order, OrderEvent, Payment, SKU, InventoryPosition, Fulfilment, Shipment, Return, Refund, CSCase, Campaign, Creative, ActivationCode/Membership.

Minimum daily owner dashboard:
- orders / paid revenue
- payment failures
- units by SKU
- available/committed inventory
- fulfilment exceptions
- dispatch/delivery exceptions
- returns/refunds
- open CS exceptions
- campaign source / conversion baseline
- membership activations from physical products

Alert-first rule: Amanda should surface exceptions and decisions, not require Edmund to inspect every transaction.
### External dependency
- Final CRM/ERP vendor is NOT required for launch if canonical data objects/export interfaces exist; avoid premature heavyweight ERP lock-in.
### Launch gate
Owner can answer: what sold, what failed, what must ship, what is stuck, what stock remains, what customers need help, and which channel generated orders.

## Gate 9 — Digital assets / continuity
### Build now
GitHub: specs, structured text, claims/evidence objects, scripts, schemas, decision logs.
Drive/object storage: product PDFs, images, packaging, video/audio masters, exports, approved creatives.
Database: dynamic customer/order/inventory/operational records.

Every production asset should carry: asset ID, SKU/topic, language, channel, version, status (draft/review/approved/published/retired), source/evidence link, owner, created/approved date, usage rights where relevant.

## What can wait until after first commercial launch
- Non-critical app animation/cosmetic polish.
- Advanced ERP features beyond order/inventory/exception visibility.
- Deep marketing automation before a repeatable manual/semiautomated funnel exists.
- Large content library beyond launch SKUs and core sleep education.
- Intelligence features without validated evidence/behaviour rules.

## Owner decisions / external setup — grouped to avoid piecemeal interruption
Do not interrupt owner until a decision becomes gating. Likely grouped decisions:
1. Payment provider/account and settlement configuration.
2. Fulfilment model/provider and commercial terms.
3. Final launch SKUs, pack sizes, price and stock date.
4. Support channel ownership.
5. Final claims/regulatory/legal approvals.

## Amanda next actions
1. Create canonical Product Knowledge Object V1 for Sleep Tape first, reusable by website, CS, app and Growth.
2. Produce fulfilment decision matrix with real candidate routes and data/integration requirements.
3. Convert this map into implementation tickets only where engineering is required; retain Amanda-owned content/ops work with Amanda.
4. Define exception/alert model for commerce operations and owner dashboard.
5. Build first launch marketing atom from approved product/evidence content.
