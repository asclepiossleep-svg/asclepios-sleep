# Canonical Commerce Data & Reporting Map V1

Owner: Amanda
Status: ACTIVE DESIGN CHECKPOINT
Priority: P0/P2 launch readiness

## Purpose
Define the minimum vendor-independent data model that lets Asclepios sell, fulfil, support, reconcile and report without prematurely locking into a heavyweight ERP.

This map implements the Launch Readiness Map and Commerce Exception / Alert / Permission Model.

## 1. Source-of-truth rule
- Asclepios canonical database owns internal IDs, lifecycle state, event history and cross-system links.
- Payment provider owns payment-network facts; Asclepios stores provider references and reconciled status.
- 3PL/carrier owns physical fulfilment facts; Asclepios stores provider references, latest state and events.
- Product Knowledge owns approved product/use/safety/claims content; commerce SKU data references it rather than duplicating editable claims.
- No external provider identifier replaces the Asclepios `order_id`, `customer_id`, `sku_id` or `exception_id`.

## 2. Minimum entities and launch fields

### Customer
`customer_id`, `email`, `phone?`, `name?`, `default_language`, `created_at`, `updated_at`, `status`.
Keep health/Sleep Intelligence profile separate from commerce identity unless a defined feature needs a permissioned link.

### Consent
`consent_id`, `customer_id`, `type`, `status`, `source`, `captured_at`, `withdrawn_at?`, `evidence_ref?`.
Marketing consent is not inferred from purchase.

### SKU
`sku_id`, `product_knowledge_id`, `title`, `variant`, `pack_size`, `barcode?`, `sellable_status`, `currency`, `unit_price`, `tax_class?`, `weight?`, `dimensions?`, `fulfilment_route`, `created_at`, `updated_at`.
Launch-blocking unknowns remain explicit null/blocked fields, never guessed.

### Order
`order_id`, `customer_id`, `currency`, `subtotal`, `discount_total`, `shipping_total`, `tax_total`, `grand_total`, `order_status`, `payment_status`, `fulfilment_status`, `shipping_address_snapshot`, `billing_address_snapshot?`, `source_channel`, `campaign_id?`, `created_at`, `paid_at?`, `cancelled_at?`.
Address is an order-time snapshot so later customer edits do not rewrite history.

### OrderItem
`order_item_id`, `order_id`, `sku_id`, `quantity`, `unit_price_snapshot`, `discount_snapshot`, `tax_snapshot`, `line_total`, `product_title_snapshot`.

### OrderEvent
`event_id`, `order_id`, `event_type`, `from_state?`, `to_state?`, `source_system`, `provider_event_id?`, `idempotency_key?`, `occurred_at`, `received_at`, `payload_ref?`.
Material events are append-only.

### Payment
`payment_id`, `order_id`, `provider`, `provider_payment_ref`, `amount`, `currency`, `status`, `authorised_at?`, `paid_at?`, `failed_at?`, `failure_code?`, `settlement_ref?`, `last_reconciled_at?`.
Do not store raw card data.

### Refund
`refund_id`, `order_id`, `payment_id`, `provider_ref?`, `amount`, `currency`, `reason_code`, `status`, `requested_at`, `approved_at?`, `completed_at?`, `requested_by_role`, `resolution_note?`.

### InventoryPosition
`inventory_position_id`, `sku_id`, `location_id`, `lot_batch?`, `expiry_date?`, `on_hand`, `committed`, `available`, `quarantined`, `inbound`, `updated_at`.
For supplements, lot/batch and expiry are mandatory where operationally applicable.

### InventoryEvent
`inventory_event_id`, `sku_id`, `location_id`, `lot_batch?`, `type`, `quantity_delta`, `reason`, `order_id?`, `return_id?`, `provider_ref?`, `occurred_at`.

### Fulfilment
`fulfilment_id`, `order_id`, `provider`, `provider_order_ref?`, `status`, `service_level`, `queued_at?`, `accepted_at?`, `picking_at?`, `dispatched_at?`, `delivered_at?`, `last_provider_sync_at?`.

### Shipment
`shipment_id`, `fulfilment_id`, `carrier`, `tracking_number`, `tracking_url?`, `status`, `dispatch_at?`, `estimated_delivery_at?`, `delivered_at?`, `exception_code?`.

### Return
`return_id`, `order_id`, `customer_id`, `reason_code`, `status`, `requested_at`, `authorised_at?`, `received_at?`, `disposition`, `refund_id?`, `notes?`.
Returned hygiene/supplement products are not automatically returned to sellable stock.

### CSCase
`case_id`, `customer_id`, `order_id?`, `sku_id?`, `lot_batch?`, `category`, `severity`, `status`, `channel`, `summary`, `approved_answer_ref?`, `assigned_role`, `created_at`, `last_activity_at`, `resolved_at?`.

### Exception
Use the canonical object defined in `COMMERCE_EXCEPTION_ALERT_PERMISSION_MODEL_V1.md`: `exception_id`, type, severity, status, cross-system references, trigger, assigned role, next action, due/resolution fields.

### Campaign / Creative
Campaign: `campaign_id`, `channel`, `name`, `status`, `start_at?`, `end_at?`, `spend?`, `utm/source identifiers`.
Creative: `creative_id`, `campaign_id?`, `asset_id`, `sku_id?`, `claim_version_ref?`, `status`, `published_at?`.

### ActivationCode / Membership
`activation_id`, `order_id?`, `order_item_id?`, `sku_id?`, `code_hash/token_ref`, `entitlement_type`, `issued_at`, `activated_at?`, `customer_id?`, `expires_at?`, `status`.
Supports physical-product QR/service entitlement without embedding entitlement logic in fulfilment provider systems.

## 3. Canonical state ownership
Order status is the orchestration state. Payment and fulfilment remain separate dimensions.

Example:
- `order_status=PAID`, `payment_status=PAID`, `fulfilment_status=NOT_QUEUED` is a valid detectable exception state.
- Do not collapse this into one ambiguous `status` field.

Canonical order lifecycle:
DRAFT -> PAYMENT_PENDING -> PAID -> FULFILMENT_QUEUED -> PICKING -> DISPATCHED -> DELIVERED.
Exception states remain explicit: PAYMENT_FAILED, ON_HOLD, CANCELLED, RETURN_REQUESTED, RETURNED, REFUND_PENDING, REFUNDED, LOST/DAMAGED.

## 4. Idempotency / reconciliation keys
Required unique or dedupe boundaries:
- provider webhook/event ID;
- checkout/payment attempt ID;
- fulfilment handoff idempotency key = stable order + fulfilment attempt contract;
- refund request idempotency key;
- inventory event provider reference where available.

Duplicate inbound events should be recorded/detected without repeating money movement, fulfilment creation or stock decrement.

## 5. Owner dashboard field map

### MONEY
Derived from Order + Payment + Refund:
- paid orders count/value today;
- gross/net paid revenue baseline;
- payment failures count/value;
- refunds completed/pending value;
- unreconciled payment/settlement exceptions.

### ORDERS
Derived from Order + Fulfilment + Shipment + Exception:
- PAID not queued;
- queued/picking;
- stale dispatch beyond SLA;
- dispatched/delivered;
- carrier/lost/damaged exceptions.

### STOCK
Derived from InventoryPosition/Event:
- available/committed/on-hand by SKU;
- inbound;
- below reorder threshold;
- projected stockout when forecasting exists;
- quarantined/expiry/lot exceptions.

### CUSTOMERS
Derived from CSCase + Return + Refund + Exception:
- open P0/P1 cases;
- unresolved delivery cases;
- return requests/received awaiting disposition;
- refund pending;
- safety cases by SKU/lot where applicable.

### GROWTH
Derived from Order source + Campaign/Creative:
- orders/revenue by source/campaign;
- conversion baseline when visit/session data is available;
- creative/SKU response;
- repeated FAQ/CS topic signal.

## 6. Daily exception queries / rules
Minimum deterministic checks:
1. `payment_status=PAID AND fulfilment_status=NOT_QUEUED` beyond short processing grace -> P1.
2. fulfilment rejected/failed -> P1.
3. `available < 0` or committed > on_hand without valid inbound policy -> P1.
4. available <= reorder threshold -> P2.
5. PICKING/QUEUED older than provider SLA -> P2; upgrade if customer promise at risk.
6. shipment carrier exception/lost/damaged -> P1/P2 according to impact.
7. refund requested with mismatched order/payment/provider amount/status -> P1.
8. return received with no disposition -> P2.
9. CS safety category -> P0 and preserve SKU/lot context.
10. duplicate provider event/idempotency collision -> do not repeat side effect; create technical exception if state differs.

## 7. Data minimisation / permissions
- Warehouse: only order fulfilment contact/address, SKU/qty, shipment/return fields needed to perform service.
- CS: order/shipment/product-approved-answer data; no raw payment credentials or unnecessary health data.
- Growth: consented campaign/aggregate conversion data; no shipping addresses/payment details.
- Engineering: schema/logs under least privilege; production secrets separate.
- Owner/Finance: financial reconciliation according to authority.
- Amanda: PMO/audit/process intelligence, not unrestricted execution of financial/legal account actions.

## 8. Vendor portability contract
Any payment/3PL/CRM adapter must map external events into these canonical objects. Switching provider should require a new adapter, not redesigning the company lifecycle.

Minimum exports must preserve:
- customers and consent history;
- orders/items/events;
- payment/refund references and reconciliation state;
- inventory/lot history;
- fulfilment/shipment/return history;
- CS/exception history;
- campaign/source attribution;
- activation/membership entitlement history.

## 9. Launch implementation sequence
1. Create schema/migrations for SKU, Customer/Consent, Order/Item/Event, Payment/Refund.
2. Add Fulfilment/Shipment + InventoryPosition/Event.
3. Add Return + CSCase + Exception.
4. Add Campaign/Creative + Activation/Membership linkage.
5. Implement provider adapters and idempotent event ingestion.
6. Implement deterministic exception queries.
7. Build owner exception dashboard.
8. Run synthetic end-to-end launch acceptance tests before live keys/stock.

## 10. Acceptance gate
The data layer is launch-ready when a synthetic customer can move through payment -> canonical paid order -> fulfilment -> tracking -> delivery, while failed payment, fulfilment rejection, low stock, carrier exception, return and refund mismatch each produce the correct visible state/exception without duplicate side effects.

## 11. Engineering handoff boundary
This document is implementation-ready architecture, but engineering should first reconcile it against the existing repository schema/order models to avoid parallel duplicate entities. Rex should receive a scoped delta ticket: EXISTING MODEL -> GAP -> REQUIRED MIGRATION/API/EVENT/TEST, not an instruction to rebuild commerce blindly.
