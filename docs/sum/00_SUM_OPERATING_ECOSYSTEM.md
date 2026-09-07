# SUM Operating Ecosystem — Master Framework

Status: binding execution architecture v1  
Owner: Amanda / Edmund  
Scope: Asclepios Health platform, beginning with Asclepios Sleep

## 1. Purpose

SUM is not a documentation layer. It is the operating spine that turns strategy, product logic, commerce, delivery, service, growth and AI management into one observable, testable, recoverable system.

A component is not considered operational merely because code, a schema, a page, a document or a PR exists. It is operational only when:

1. it has an input;
2. it produces an output;
3. its upstream and downstream interfaces are defined;
4. it can be exercised in a real or staged flow;
5. its success/failure can be observed;
6. failure has an owner and recovery path;
7. the result is auditable.

## 2. Whole-system operating loop

Traffic / Campaign / QR / Direct
→ Public AsclepiosHealth.com
→ Product education / Shop / Sleep Intelligence entry
→ Shopify catalogue / cart / checkout
→ Payment
→ Order
→ Inventory
→ Fulfilment / 3PL
→ Courier / tracking
→ Delivery
→ QR activation / Account
→ Entitlement
→ Assessment / Tonight / Programme
→ Morning feedback / Review
→ Support / Return / Refund
→ CRM / Retention / Repeat purchase
→ Management reporting
→ Growth optimisation
→ back to traffic and campaigns.

No link is optional for launch readiness. A later-stage provider may be temporary or simulated, but every link must have an explicit implementation state and test path.

## 3. The six-layer architecture

### Layer A — Public experience
- AsclepiosHealth.com
- Home
- Shop
- Product pages
- Learn / education
- Sleep Intelligence entry
- Account entry
- Language and market handling

### Layer B — Commerce and physical operations
- Shopify product catalogue
- cart / checkout
- payment
- order
- inventory
- fulfilment
- courier
- tracking
- returns/refunds

### Layer C — Digital product/service engine
- account
- activation code / QR
- entitlement
- assessment
- four-domain model: Rhythm / Calm / Body / Support
- Tonight's Plan
- sleep player
- morning check-in
- 7-day review
- 28-day reassessment

### Layer D — Growth and customer lifecycle
- acquisition
- campaign attribution
- content distribution
- CRM
- lifecycle messaging
- repeat purchase
- referral / retention
- conversion analytics

### Layer E — Company operating control
- canonical customer/SKU/order/payment/inventory/fulfilment/support records
- finance/reconciliation inputs
- owner/approval gates
- exception queue
- operating dashboard
- launch/readiness gates

### Layer F — Technical platform and observability
- GitHub source control
- Vercel delivery
- Supabase data/services
- Shopify connector/API/webhooks
- CI/test automation
- logging
- health checks
- alerting
- retries / dead-letter handling
- audit trail
- backup/restore

## 4. Mandatory interface contract

Every system boundary must define:

- source system;
- destination system;
- canonical object/ID;
- trigger/event;
- payload minimum fields;
- idempotency rule;
- acknowledgement condition;
- retry rule;
- timeout/expiry rule;
- error classification;
- human escalation owner;
- audit/log location;
- health metric;
- acceptance test.

## 5. Event-driven backbone

Minimum canonical events:

- visitor_landed
- product_viewed
- add_to_cart
- checkout_started
- payment_succeeded
- payment_failed
- order_created
- order_cancelled
- inventory_reserved
- fulfilment_requested
- fulfilment_acknowledged
- shipment_created
- shipment_delivered
- shipment_exception
- activation_issued
- activation_succeeded
- activation_failed
- entitlement_activated
- entitlement_expired
- assessment_completed
- tonight_plan_generated
- tonight_action_completed
- morning_checkin_submitted
- review_generated
- support_case_opened
- return_requested
- refund_completed
- campaign_attributed
- repeat_purchase

Events are evidence of motion. If a business process is supposed to move but emits no event or state transition, SUM treats it as non-observable and therefore incomplete.

## 6. Health model

Every major chain reports one of four states:

- GREEN — working and recently verified;
- AMBER — partial/degraded/manual fallback;
- RED — broken or unable to complete the required flow;
- GREY — designed but never yet exercised.

Minimum health probes:

- public site reachable;
- product catalogue returned;
- product page renders;
- cart action succeeds;
- checkout reachable;
- payment test result received;
- order captured once only;
- inventory state updated;
- fulfilment handoff acknowledged;
- tracking stored;
- activation accepted/rejected correctly;
- entitlement visible in member area;
- Tonight's Plan consumes entitlement/product state;
- support can resolve customer/order context;
- analytics event arrives;
- dashboard reflects the event.

## 7. Debug and recovery loop

RUN → OBSERVE → DETECT → DIAGNOSE → RECOVER → VERIFY → LEARN → RUN AGAIN

### Detect
Compare expected state transitions against actual events and SLA windows.

### Diagnose
Classify failure as:
- user/input;
- business rule;
- provider/API;
- code;
- data;
- credentials/config;
- timeout/network;
- physical operation;
- owner decision required.

### Recover
Preferred sequence:
1. safe automatic retry;
2. idempotent replay;
3. provider fallback/manual bridge;
4. exception queue;
5. owner escalation only if a real business decision is needed.

### Verify
Never mark recovered until the downstream state and event are both observed.

## 8. Execution priority rule

At every cycle ask:

> If 100 real customers entered now, where would the end-to-end journey first break?

That first broken link outranks cosmetic polish and isolated internal optimisation.

Priority order:
1. missing top-level body part;
2. broken critical interface;
3. unobservable critical process;
4. manual-only critical process;
5. reliability/recovery gap;
6. optimisation;
7. cosmetic polish.

## 9. Systems of record

Provider tools may change, but canonical ownership must stay stable.

- Customer truth: Asclepios canonical customer ID + external aliases
- Commerce truth: Shopify transaction evidence mapped to canonical Asclepios order/order lines
- Payment truth: provider payment event + payment ledger
- Inventory truth: SKU/location ledger
- Fulfilment truth: fulfilment/shipment records
- Digital entitlement truth: Asclepios entitlement service
- Product intelligence truth: versioned Asclepios product/claims/routine data
- Support truth: linked support case record
- Reporting truth: derived from canonical events/records, never re-keyed totals

## 10. External-provider strategy

Do not invent infrastructure where a mature standard service already exists.

Adopt proven patterns first, then customise only where Asclepios creates differentiated value.

Likely provider classes:
- commerce: Shopify;
- payments: Shopify Payments / another approved mature provider;
- hosting/CDN: Vercel;
- application DB/auth/storage: Supabase where appropriate;
- fulfilment: selected 3PL/warehouse;
- courier: 3PL/carrier integration;
- email/CRM: mature lifecycle platform selected later;
- monitoring/error capture: standard observability provider plus internal health dashboard;
- analytics: web + commerce + canonical event stream.

Provider selection is separable from the canonical SUM interface contract.

## 11. Definition of Done

### Designed
Architecture/rule exists.

### Connected
Real interface exists.

### Exercised
A staged or live transaction has crossed the interface.

### Observable
Success/failure is captured.

### Recoverable
Retry/exception/escalation exists.

### Operational
Connected + Exercised + Observable + Recoverable.

Only Operational is counted as truly alive.

## 12. Three logic packs mounted into SUM

SUM consumes three explicit logic files:

1. `01_AI_OPERATING_LOGIC.md` — company/AI management and execution control.
2. `02_SLEEP_INTELLIGENCE_LOGIC.md` — differentiated Asclepios Sleep decision/service logic.
3. `03_GROWTH_MARKETING_LOGIC.md` — acquisition, conversion, CRM, retention and feedback loop.

These logic packs do not operate independently. Each must declare its inputs, outputs, events, dependencies, monitoring and recovery paths through SUM.

## 13. Immediate implementation sequence

P0 — Public storefront shell on Vercel  
P0 — Shopify real catalogue ingestion from approved Asclepios catalogue  
P0 — Shop → Product → Cart → Checkout test chain  
P0 — Order/payment event mapping  
P0 — fulfilment handoff contract  
P0 — canonical health dashboard/event ledger  
P1 — QR/activation → entitlement → member flow  
P1 — Sleep Intelligence loop connected to product ownership  
P1 — CRM/campaign attribution loop  
P1 — exception/retry/reconciliation jobs  
P2 — optimisation, experimentation and cosmetic refinement

This sequence is dependency-driven, not page-driven.