# Commerce C1 — Schema Implementation Spec V1

Owner: Amanda
Status: IMPLEMENTATION-READY / NOT YET ASSIGNED
Priority: P0/P2 launch readiness
Engineering owner when scheduled: Rex

## Purpose
Turn the approved commerce delta into one small, reviewable first engineering slice that can be implemented without choosing Stripe/Worldpay/Shopify, a 3PL, or a heavyweight ERP.

C1 adds only the canonical **Order / OrderItem / OrderEvent / Payment / Refund** persistence layer and relations required for later deterministic services.

This spec is additive to the current Prisma architecture. It must preserve existing `User`, `Product`, `ProductOwnership`, `Membership`, `Entitlement`, `ActivationCode`, `AuditLog` and `AnalyticsEvent` responsibilities.

## 1. Repository evidence / constraints
Current repository facts verified before writing this spec:
- local development schema: `apps/api/prisma/schema.prisma` using SQLite;
- staging schema must remain model-equivalent: `apps/api/prisma/schema.staging.prisma` using PostgreSQL;
- repository parity rule: run `npm run check:schema-parity` after edits;
- `User` is the canonical authenticated customer identity;
- `Product` is the canonical product catalogue root and already carries `code`, `priceCents`, `currency`, `market` and lifecycle state;
- ownership/entitlement remains separate from payment truth.

## 2. Design rules for C1
1. No payment-provider-specific columns except generic provider/reference strings.
2. No card details, payment secrets or raw sensitive payment credentials.
3. Historical orders use snapshots; later edits to User/Product must not rewrite transaction history.
4. Payment state and Order state remain separate.
5. Material order state changes receive append-oriented `OrderEvent` records.
6. Provider/webhook event deduplication must be possible through unique idempotency/external-event keys.
7. Guest checkout must be structurally possible even when `userId` is null.
8. Money is stored in integer minor units; currency is explicit on transaction rows.
9. C1 creates persistence only. It does not implement checkout routes, payment webhooks, fulfilment, stock, CS or UI.

## 3. Recommended enums
Use Prisma enums if they maintain SQLite/Postgres parity cleanly in this repository; otherwise use constrained strings with shared application constants. Do not maintain two divergent state vocabularies.

### OrderStatus
- `DRAFT`
- `PAYMENT_PENDING`
- `PAID`
- `FULFILMENT_QUEUED`
- `PICKING`
- `DISPATCHED`
- `DELIVERED`
- `PAYMENT_FAILED`
- `ON_HOLD`
- `CANCELLED`
- `RETURN_REQUESTED`
- `RETURNED`
- `REFUND_PENDING`
- `REFUNDED`
- `LOST_DAMAGED`

C1 will persist the complete canonical vocabulary even though C2/C4 will implement later transitions.

### PaymentStatus
- `INITIATED`
- `AUTHORISED`
- `PAID`
- `FAILED`
- `CANCELLED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

### RefundStatus
- `REQUESTED`
- `PENDING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`

## 4. Model: Order
Recommended fields:

```text
id                String   @id @default(cuid())
orderNumber       String   @unique
userId            String?
status            OrderStatus or String
currency          String
subtotalMinor     Int
shippingMinor     Int      @default(0)
taxMinor          Int      @default(0)
discountMinor     Int      @default(0)
totalMinor        Int
buyerEmail        String
buyerName         String?
buyerPhone        String?
shippingAddressJson String?
billingAddressJson  String?
source            String   @default("OWNED_WEB")
createdAt         DateTime @default(now())
updatedAt         DateTime @updatedAt
```

Relations:
- `user User? @relation(...)`
- `items OrderItem[]`
- `events OrderEvent[]`
- `payments Payment[]`
- `refunds Refund[]`

Required indexes:
- `@@index([userId, createdAt])`
- `@@index([status, createdAt])`
- `@@index([buyerEmail, createdAt])`

Notes:
- `orderNumber` is customer-safe/display-safe and distinct from database `id`.
- Address snapshots are deliberately transaction-owned. JSON/string representation is acceptable for C1; do not prematurely create a general address-book subsystem.
- `totalMinor` must be persisted and testable against the component total; validation belongs to service layer in C4.

## 5. Model: OrderItem
Recommended fields:

```text
id                  String   @id @default(cuid())
orderId             String
productId           String
productCodeSnapshot String
productTitleSnapshot String
fulfilmentSkuSnapshot String?
unitPriceMinor      Int
quantity            Int
taxMinor            Int      @default(0)
discountMinor       Int      @default(0)
lineTotalMinor      Int
createdAt           DateTime @default(now())
```

Relations:
- `order Order @relation(... onDelete: Cascade)` only if existing repository migration conventions permit transaction-child cascade safely;
- `product Product @relation(...)`.

Required indexes:
- `@@index([orderId])`
- `@@index([productId])`

Acceptance rule: updating `Product.name`, `Product.priceCents` or `Product.code` after purchase must not change the snapshots or price held on an existing OrderItem.

## 6. Model: OrderEvent
Recommended fields:

```text
id                String   @id @default(cuid())
orderId           String
kind              String
fromStatus        String?
toStatus          String?
sourceSystem      String
externalReference String?
idempotencyKey    String?
payloadJson       String?
createdAt         DateTime @default(now())
```

Required indexes/uniqueness:
- `@@index([orderId, createdAt])`
- unique idempotency constraint when value exists. If Prisma/SQLite nullable uniqueness semantics complicate portability, use a deterministic non-null event key generated by service code for provider-originated events and document the chosen approach.

C1 note: the schema enables append-only operation; C4 must prevent update/delete of domain events through normal service interfaces.

## 7. Model: Payment
Recommended fields:

```text
id                String   @id @default(cuid())
orderId           String
provider          String
providerReference String?
status            PaymentStatus or String
amountMinor       Int
currency          String
idempotencyKey    String?
authorisedAt      DateTime?
paidAt            DateTime?
failedAt          DateTime?
cancelledAt       DateTime?
createdAt         DateTime @default(now())
updatedAt         DateTime @updatedAt
```

Required indexes/uniqueness:
- `@@index([orderId, createdAt])`
- `@@index([status, createdAt])`
- provider/reference pair unique when a provider reference exists, using the repository-compatible nullable strategy;
- idempotency key must support safe replay handling in C4.

Rules:
- `Payment.PAID` does not automatically mean fulfilment exists; C4 will evaluate transition to `Order.PAID` then queue fulfilment.
- browser success pages are never the source of truth.

## 8. Model: Refund
Recommended fields:

```text
id                String   @id @default(cuid())
orderId           String
paymentId         String
provider          String
providerReference String?
status            RefundStatus or String
amountMinor       Int
currency          String
reason            String?
idempotencyKey    String?
requestedAt       DateTime @default(now())
completedAt       DateTime?
createdAt         DateTime @default(now())
updatedAt         DateTime @updatedAt
```

Relations:
- `order Order`
- `payment Payment`

Required indexes/uniqueness:
- `@@index([orderId, createdAt])`
- `@@index([paymentId, createdAt])`
- provider/reference replay protection when reference exists;
- idempotency key usable by later refund reconciliation.

Rule: C1 only stores refund state; no automatic or live provider refund action is part of this slice.

## 9. Existing-model relation additions
Add only the reverse relations needed by Prisma:

### User
- `orders Order[]`

### Product
- `orderItems OrderItem[]`

Do not add payment truth to ProductOwnership/Membership/Entitlement.

## 10. Migration / parity requirements
Rex implementation must:
1. edit `schema.prisma`;
2. make model-equivalent change in `schema.staging.prisma`;
3. generate a named local migration following repository conventions;
4. regenerate Prisma client;
5. run schema parity check;
6. run existing API/shared typecheck/tests that are affected by Prisma client generation;
7. not edit datasource provider lines;
8. not delete/rewrite existing seeded Product/User/entitlement data.

## 11. C1 tests / verification
Minimum test evidence before C1 can be marked implemented:
1. Prisma schema validates locally.
2. staging schema validates/model parity passes.
3. migration applies to a disposable existing-style local database without destructive reset.
4. an authenticated-user Order can be created with items/payment/event.
5. a guest Order can be created with `userId = null` and buyer snapshots.
6. Product update after order creation leaves OrderItem snapshots unchanged.
7. same provider/idempotency identity cannot be inserted twice under the chosen uniqueness strategy.
8. one Order may support multiple payment attempts and a refund linked to the successful payment.
9. no ProductOwnership, Membership or Entitlement is created merely by inserting Order/Payment records.
10. existing non-commerce tests remain green or any unrelated pre-existing failure is explicitly separated.

## 12. Definition of Done for C1
C1 is `IMPLEMENTED` only when:
- all five canonical models and relations exist in both schemas;
- migration/client generation succeeds;
- parity and verification evidence exists;
- no live provider integration, UI or hidden business logic is smuggled into the schema slice;
- no existing identity/catalogue/entitlement architecture is duplicated or collapsed.

C1 is not `OPERATIONAL`: service transitions and payment integration belong to later slices.

## 13. Explicitly deferred to C2+
- inventory positions/lots;
- fulfilment/shipment/returns;
- CSCase and CommerceException;
- deterministic payment/order transition services;
- webhook handlers/adapters;
- checkout UI/API;
- owner dashboard projections;
- live payment and fulfilment providers.

## 14. Owner decision
No Edmund decision is required to implement this schema-only slice because it remains provider-independent, non-destructive in intent and inside the already-approved launch architecture. Any destructive migration finding, provider/account choice or production write remains an owner gate.
