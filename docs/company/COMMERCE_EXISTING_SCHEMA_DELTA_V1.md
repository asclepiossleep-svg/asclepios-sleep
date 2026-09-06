# Commerce Existing-Schema Delta V1

Owner: Amanda
Status: IMPLEMENTATION-READY RECONCILIATION
Priority: P0/P2 launch readiness

## Purpose
Reconcile `CANONICAL_COMMERCE_DATA_REPORTING_MAP_V1.md` against the repository's existing Prisma model before asking Rex to build commerce. Reuse what exists; add only the minimum missing commerce layer. Do not create a parallel customer/product/entitlement system and do not introduce a heavyweight ERP.

## Evidence reviewed
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/schema.staging.prisma` follows the repository parity rule and must remain model-equivalent.
- Existing product/account/entitlement architecture is intentionally separated and should be preserved.

## Executive finding
The repository already has strong **identity, consent, product catalogue, product ownership, membership/entitlement, activation-code, audit and analytics foundations**, but it does **not yet contain the canonical transactional commerce backbone** needed for owned-site selling and operational control.

Therefore the correct engineering move is an **additive commerce module linked to existing User/Product**, not replacement of existing models.

## 1. Reuse as-is or extend minimally

### User -> canonical Customer
Reuse `User` as the authenticated customer identity. Do not create a duplicate `Customer` table merely to satisfy commerce naming.

Commerce additions should reference `User.id` where the buyer has an account. Orders must also support guest/contact snapshots so historical orders remain valid if a user later changes profile data.

### ConsentRecord -> canonical Consent
Reuse `ConsentRecord` for policy/marketing/research consent history. Commerce checkout may need additional consent types/version records, but not another consent table.

### Product -> canonical SKU foundation
Reuse `Product` as the current sellable product/catalogue root. It already has code, name, description, category, image, price, currency, market and lifecycle state.

Minimum extensions or companion SKU model should only be added when real packaging variants require them, e.g. barcode, pack size, physical variant, tax class, weight/dimensions, fulfilment SKU. Do not prematurely split every Product into Product+SKU if launch products are one sellable pack each.

### ProductOwnership / Membership / Entitlement
Preserve separation. A paid order may grant ownership/entitlement after the relevant paid/activation rule, but payment state must never be inferred from these tables.

### QrBatch / ActivationCode
Reuse for physical-product digital activation. Link future activation analytics back to order/order item where available, without making an order mandatory for distributor/offline activation.

### AuditLog
Reuse for privileged/manual operational changes. Commerce additionally needs a domain event timeline because order/payment/fulfilment state history is operational data, not merely admin audit.

### AnalyticsEvent
Reuse for behavioural/product analytics. Do not use it as the source of truth for orders, money, inventory or fulfilment.

## 2. Missing launch-critical transactional models

The following are the minimum additive models required before owned-site commerce can be considered structurally implemented.

### Order
Required fields:
- `id`
- human-safe `orderNumber` unique
- `userId?` -> User
- `status` orchestration state
- `currency`
- subtotal/shipping/tax/discount/total integer minor units
- buyer email/contact snapshot
- shipping/billing address snapshot JSON or structured owned snapshot
- `source` / channel
- `createdAt`, `updatedAt`

Do not derive PAID solely from browser return state.

### OrderItem
- `orderId`
- `productId` -> existing Product
- product/SKU code snapshot
- title snapshot
- unit price, quantity, tax/discount amounts
- fulfilment SKU snapshot if applicable

Historical price/title must remain stable even when Product changes later.

### OrderEvent
Append-only canonical state/event timeline:
- orderId
- event type
- from/to state where relevant
- source system/provider
- external reference
- idempotency/event key
- payload/evidence reference
- timestamp

### Payment
- orderId
- provider
- provider payment/intent reference unique where applicable
- status separated from Order status
- amount/currency
- authorised/paid/failed/cancelled timestamps as relevant
- idempotency key

Do not store card secrets or raw sensitive payment credentials.

### Refund
- paymentId + orderId
- provider refund reference
- amount/currency
- status
- reason
- requested/completed timestamps
- initiatedBy / authority context where needed

### InventoryPosition
Per sellable fulfilment SKU/location:
- productId/SKU reference
- location/provider
- onHand
- committed
- available or deterministic derivation
- inbound if tracked
- updatedAt

### InventoryLot
Required for consumable/supplement traceability where applicable:
- product/SKU
- lot/batch
- expiry
- quantity/status/location
- receivedAt
- quarantine/recall state

Sleep Tape may use lot/batch if supplier traceability supports it; supplements make this non-negotiable.

### Fulfilment
- orderId
- provider
- provider fulfilment reference
- status independent from Order
- requestedAt/acceptedAt
- error/exception code
- idempotency key

### Shipment
- fulfilmentId/orderId
- carrier/service
- tracking number/url data
- status
- dispatched/delivered timestamps
- delivery exception code

### Return
- orderId + relevant items
- status/reason
- requested/received timestamps
- disposition
- restock/quarantine/disposal outcome

### CSCase
- userId? / orderId? / productId?
- category
- severity/status
- assigned role
- safety flag
- opened/resolved timestamps

### CommerceException
Implement the approved exception object rather than hiding exceptions in logs:
- type/severity/status
- linked order/payment/product/fulfilment/return/CS entities as applicable
- trigger/source
- assigned role
- next action/due state
- resolution code/note
- timestamps

### CampaignAttribution (minimal)
Do not build a marketing suite. Store enough order-level attribution to answer acquisition source/creative where consent and channel data permit. Existing `AnalyticsEvent` can retain behavioural detail.

## 3. Explicit non-goals for first implementation
Do NOT:
- replace User with a new Customer identity system;
- replace Product with a second catalogue;
- merge Membership, ProductOwnership and Entitlement;
- use AnalyticsEvent as financial ledger;
- build a general ERP;
- build supplier purchasing/accounting/general-ledger modules before launch requires them;
- hard-code ShipBob/Amazon/Huboo columns into Order;
- store provider secrets/payment credentials in commerce tables;
- grant fulfilment from a client-side success page.

## 4. Relationship boundary
Recommended core relationship:

`User? -> Order -> OrderItem -> Product`

`Order -> Payment -> Refund`

`Order -> OrderEvent`

`Order -> Fulfilment -> Shipment`

`Order -> Return`

`Product -> InventoryPosition -> InventoryLot`

`User?/Order?/Product? -> CSCase`

`Order?/Payment?/Fulfilment?/Return?/CSCase? -> CommerceException`

`OrderItem/payment-or-activation-rule -> ProductOwnership / Entitlement / Membership`

The final line is a service/workflow boundary, not a reason to collapse models.

## 5. State separation acceptance rule
Engineering must preserve separate state machines:
- Payment: INITIATED / AUTHORISED / PAID / FAILED / CANCELLED / PARTIALLY_REFUNDED / REFUNDED
- Order orchestration: DRAFT / PAYMENT_PENDING / PAID / FULFILMENT_QUEUED / PICKING / DISPATCHED / DELIVERED plus approved exception states
- Fulfilment: REQUESTED / ACCEPTED / PICKING / SHIPPED / FAILED / CANCELLED etc. provider-normalised
- Refund and Return each have their own state.

A state change in one domain triggers an evaluated transition in another; it does not overwrite the other domain's truth.

## 6. Minimum engineering slices for Rex
When implementation becomes active, use small reviewable slices:

**Slice C1 — schema only**
Add Order, OrderItem, OrderEvent, Payment, Refund and required relations/indexes. Mirror schema changes to staging schema and pass parity check. No live provider integration.

**Slice C2 — inventory/fulfilment schema**
Add InventoryPosition/Lot, Fulfilment, Shipment, Return and provider-independent status fields. No provider-specific lock-in.

**Slice C3 — exception/CS schema**
Add CSCase + CommerceException with role/severity/status links and immutable/append-oriented evidence rules.

**Slice C4 — deterministic services/tests**
Create idempotent server-side paid-order transition, fulfilment queue transition, refund reconciliation and exception creation. Synthetic provider adapters only are acceptable initially.

**Slice C5 — owner reporting projection**
Build queries/projection for Money / Orders / Stock / Customers / Growth and P0/P1 exception-first summary. This is reporting over canonical data, not a second database.

**Slice C6 — external adapters**
Only after provider/account decisions: payment adapter and fulfilment adapter. Keep canonical domain independent.

## 7. Tests required before provider integration
1. Duplicate payment webhook/event cannot create duplicate Payment, OrderEvent or fulfilment request.
2. PAID order stranded before fulfilment becomes detectable P1.
3. Failed payment never grants ownership/entitlement and never queues fulfilment.
4. Product price change after purchase does not rewrite historical OrderItem price.
5. Guest/contact snapshot survives later User profile changes.
6. Refund replay cannot double-refund or duplicate canonical refund event.
7. Inventory committed cannot silently exceed available without exception.
8. Lot/expiry data can trace affected shipped orders for a test recall scenario.
9. Role/audit tests protect manual order/refund/exception changes.
10. SQLite and staging Postgres Prisma schemas remain model-parity compliant.

## 8. Decision checkpoint
No Edmund decision is required for this schema delta. It follows already-approved launch-first, provider-independent and least-privilege principles.

Owner decisions remain deferred until genuinely gating: payment merchant account/provider, fulfilment contract, final launch SKU/pack/price/stock date, support ownership and final legal/regulatory claims approval.

## 9. Amanda next action
Before assigning C1 to Rex, reconcile the approved Sleep Tape Product Knowledge Object into implementation-ready Product/product-page/CS fields. This keeps Amanda advancing launch content while Rex capacity can later be spent only on the precise commerce schema delta above.
