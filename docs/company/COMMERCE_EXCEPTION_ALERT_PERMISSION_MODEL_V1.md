# Commerce Exception, Alert & Permission Model V1

Owner: Amanda
Status: ACTIVE DESIGN CHECKPOINT
Priority: P0/P2 business-launch readiness

## Purpose
Make the commercial operation exception-driven: routine orders flow automatically; people and Amanda focus on transactions that are stuck, unsafe, financially inconsistent or need authority.

## 1. Operating principle
NORMAL EVENT -> deterministic state transition -> record event -> continue.
EXCEPTION -> classify severity -> assign owner -> alert/escalate -> resolve -> record reason/outcome -> learn.

No paid order, refund, fulfilment failure or safety-sensitive CS case may silently disappear between systems.

## 2. Severity model
- P0 CRITICAL: safety/regulatory concern, suspected payment/security incident, material data integrity failure, recall/lot issue. Immediate hold where appropriate + owner escalation.
- P1 URGENT: paid order cannot enter fulfilment, repeated fulfilment rejection, refund mismatch, inventory oversell, high-risk/reputational complaint. Same operating-cycle attention.
- P2 ACTION: stale picking/dispatch, carrier exception, return awaiting disposition, repeated payment failures, stock approaching reorder threshold. Queue with accountable owner and due state.
- P3 WATCH: trends that do not require transaction intervention yet, e.g. rising FAQ topic, conversion deterioration, increased delivery time.

## 3. Launch-critical exception rules
| Trigger | Severity | Automatic action | Human/System owner | Escalation condition |
|---|---|---|---|---|
| Payment authorised/paid but no canonical order | P1 | stop fulfilment; reconcile provider event | Commerce Ops | unresolved next operating cycle -> Amanda/owner dashboard |
| Canonical PAID order not FULFILMENT_QUEUED | P1 | retry idempotent fulfilment handoff; prevent duplicate | Operations | retry fails -> Ops + Amanda |
| Fulfilment provider rejects order | P1 | ON_HOLD; preserve paid state; capture error | Operations | address/product/system cause unresolved -> CS/Amanda |
| Inventory available < committed | P1 | block new sellable allocation for affected SKU | Operations | oversell/customer impact -> Amanda |
| Inventory below reorder threshold | P2 | replenishment alert | Operations/Purchasing | projected stockout before replenishment -> Amanda |
| Picking/dispatch exceeds SLA | P2 | query provider/status; open exception | Operations | customer promise at risk -> CS |
| Carrier lost/damaged exception | P1 | open CS case + replacement/refund decision path | CS + Operations | repeated pattern/high value -> Amanda |
| Refund requested but provider/order states disagree | P1 | REFUND_PENDING; no duplicate refund | Finance/Commerce | reconciliation failure -> Amanda |
| Return received, disposition missing | P2 | quarantine returned unit; do not resell automatically | Operations | supplement/tape hygiene/safety uncertainty -> disposal/review rule |
| Safety/adverse-use complaint | P0 | stop promotional advice; preserve case/SKU/lot data; route to approved safety process | CS Safety Lead/Amanda | regulatory/medical escalation threshold met -> owner/professional review |
| Repeated product question above threshold | P3 | create Product Knowledge/Growth insight | Amanda | evidence/copy change required -> product review |
| Campaign conversion materially below baseline | P3 | diagnostic task, do not auto-increase spend | Growth/Amanda | paid-spend change required -> owner approval |

## 4. Exception object
Every exception record should contain:
`exception_id`, `type`, `severity`, `status`, `created_at`, `last_changed_at`, `customer_id?`, `order_id?`, `payment_id?`, `sku?`, `lot_batch?`, `provider_reference?`, `source_system`, `trigger`, `evidence_payload_ref`, `assigned_role`, `next_action`, `due_at?`, `resolution_code?`, `resolution_note?`, `closed_at?`.

Status: OPEN -> ACKNOWLEDGED -> ACTIONING -> WAITING_EXTERNAL -> RESOLVED, with REOPENED available. Exceptions are never deleted to hide history.

## 5. Permissions / separation of duties
### Edmund / Owner
Can approve provider contracts, paid-spend changes, material refund-policy changes, legal/regulatory decisions, financial-account changes and destructive/account-level actions. Receives exception summary, not routine noise.

### Amanda / CEO Office + PMO
Can classify/prioritise, audit, coordinate, update knowledge/process rules, create implementation requirements, identify trends and escalate owner decisions. Cannot execute paid/account/legal/financial actions without approval.

### Commerce Operations
Can inspect orders, correct operational metadata under audit trail, retry approved idempotent handoffs, place/release operational holds under rules. Cannot alter settled payment records or invent refunds.

### Fulfilment / Warehouse
Minimum access: fulfilment-required customer/order/SKU data, inventory movements, tracking, return receipt/disposition. No marketing profile or unnecessary health/intelligence data.

### Customer Service
Can view customer/order/shipment and approved Product Knowledge, create cases, request cancellation/return/refund under policy. Cannot edit product claims/evidence or directly alter immutable payment events.

### Finance / authorised commerce admin
Can reconcile settlements/refunds and approve financial exceptions within delegated limits. Payment/refund changes require audit trail.

### Growth / Marketing
Can use consented campaign/creative/conversion data and approved claims. No access to unnecessary order address, payment or health/intelligence data.

### Rex / Engineering
Can implement schemas, integrations, alerts and UI against approved requirements; production secrets and business authority remain least-privilege.

## 6. Owner dashboard: exception-first
Top panel must answer without opening individual systems:
1. MONEY: paid revenue; failed payments; refund value pending; settlement mismatch.
2. ORDERS: paid awaiting fulfilment; stale picking/dispatch; delivery exceptions.
3. STOCK: available, committed, inbound; projected stockout/reorder alerts; lot/expiry exceptions.
4. CUSTOMERS: open P0/P1 CS cases; returns/refunds; safety escalations.
5. GROWTH: conversion baseline, campaign anomalies, product/FAQ signals.

Display P0/P1 first. Routine successful orders are aggregate counts, not notification spam.

## 7. Notification routing
- P0: immediate owner/Amanda escalation plus accountable operational role.
- P1: operational owner immediately; Amanda surfaced in active exception queue; owner only when material, unresolved or authority is required.
- P2: role queue + daily exception summary.
- P3: trend/weekly product-operations review unless threshold worsens.

Do not send repeated alerts for the same unchanged exception. Alert on creation, severity increase, due-state breach, material new evidence or resolution.

## 8. Automation safety
- Idempotency key required for payment, order and fulfilment retries.
- Automated retry must have a bounded count and backoff; then route to exception queue.
- Never auto-refund solely because a webhook or carrier event is missing.
- Never auto-publish new medical/health claims from CS/research signals.
- Never auto-increase paid marketing spend.
- Immutable event timeline for material commerce state changes.

## 9. Launch acceptance tests
Before live sales, demonstrate:
1. Paid order whose fulfilment handoff fails becomes visible P1 and cannot duplicate on retry.
2. Failed payment does not create fulfilment.
3. Low-stock threshold creates one actionable alert, not repeated spam.
4. Carrier exception links to order/customer and opens correct CS route.
5. Refund mismatch is held for reconciliation and cannot double-refund.
6. Safety complaint preserves SKU/lot context and routes away from generic CS advice.
7. Owner dashboard clearly separates P0/P1 exceptions from routine activity.
8. Role tests prove CS/Marketing/Warehouse cannot see or change data outside their need.

## 10. Next implementation boundary
Amanda next: map this model to the canonical CRM/order entities and define dashboard/report fields. Rex only needs an engineering ticket when the commerce data layer/order flow is ready for implementation. Do not build a heavyweight ERP solely to satisfy this document.
