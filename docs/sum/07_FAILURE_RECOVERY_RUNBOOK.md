# SUM Failure / Recovery Runbook

This runbook turns integration failures into controlled states instead of silent breakage.

## Universal incident record

Every material failure carries:
- incident_id
- correlation_id / event_id
- link_name
- provider
- environment
- severity
- first_seen_at / last_seen_at
- attempt_count
- canonical object IDs
- provider refs
- error_class (auth, validation, timeout, rate_limit, provider_5xx, invariant, unknown)
- retryable boolean
- next_retry_at
- operator_action
- resolved_at
- reconciliation_result

## Retry policy

Retry only idempotent/replay-safe actions.

Default retry ladder for transient external failures:
`1m → 5m → 15m → 1h → 6h`, with jitter. After the bounded ladder, move to exception/dead-letter state and alert the owner/operator channel. Never infinite-loop.

Rate limits obey provider `Retry-After`/native guidance where supplied.

## Idempotency rules

- Incoming provider webhook: dedupe by provider + event ID; persist receipt before side effects.
- Payment: never create a second canonical payment/order from a replayed success event.
- Fulfilment: one command has a stable idempotency key; retry does not create duplicate shipment.
- Entitlement: grant/extend operation is deterministic for the same qualifying source event/rule version.
- Email: use message purpose + object ID + template version to prevent duplicate customer notices where harmful.

## Reconciliation jobs

Webhooks are fast-path signals, not the only truth. Scheduled reconciliation checks provider truth against canonical state:

- Shopify: orders/payments/fulfilment statuses vs canonical order ledger.
- Payment provider: captured/refunded totals vs canonical payment ledger.
- 3PL/carrier: accepted/shipped/delivered/exceptions vs fulfilment records.
- Activation: issued codes vs qualifying orders; entitlements vs successful activations.
- CRM: consent/customer lifecycle state vs canonical customer consent.

Any mismatch becomes a reconciliation exception with explicit repair action.

## Core failure playbooks

### Website / Vercel unreachable
1. Health probe fails twice.
2. Mark public-front-door `DEGRADED/FAILED`.
3. Check latest deployment/check status and DNS separately.
4. If latest release caused failure, rollback/promote previous known-good deployment where owner policy permits.
5. Re-run homepage/product synthetic checks.
6. Record recovery evidence.

### Shopify catalogue empty / sync failure
1. Do not render fake sellable products.
2. Mark commerce catalogue failed.
3. Compare canonical launch catalogue with Shopify product records.
4. Replay only missing safe draft/product sync operations.
5. Verify storefront product resolution and cartability.

### Payment webhook missing
1. Never assume paid based only on browser redirect.
2. Query provider/order truth during reconciliation.
3. If captured, idempotently apply canonical payment success and order transition.
4. If uncertain, hold fulfilment.
5. Alert after bounded retry window.

### Duplicate payment/order event
1. Detect idempotency key/event ID collision.
2. Return success acknowledgement where provider expects it, without repeating side effects.
3. Log duplicate as informational unless canonical totals disagree.

### Fulfilment provider unavailable
1. Preserve paid order in `fulfilment_pending`.
2. Retry adapter according to bounded policy.
3. Never mark shipped without provider shipment evidence.
4. After threshold, create operator exception.
5. When recovered, reconcile before dispatching duplicates.

### Tracking delayed
1. Keep fulfilment status distinct from customer-facing delivery confidence.
2. Poll/reconcile carrier/3PL after webhook SLA missed.
3. If material delay threshold breached, surface support/notification workflow.

### QR activation failure
1. Validate code state, SKU/order/rule version, expiry/revocation.
2. Never manually grant access until qualifying purchase/source is verified.
3. On transient DB/service failure, retry same activation idempotently.
4. If code data is invalid, create support case linked to order/code.

### Sleep engine failure
1. Safety state remains higher priority than recommendations.
2. Preserve last valid plan/state; do not invent new recommendation.
3. Log decision input/version/correlation ID.
4. Retry deterministic engine if dependency failure; otherwise quarantine invalid rule/config and fall back to safe baseline experience.

## Monitoring expectations

A healthy service with a broken business path is not green. Dashboard must show separately:
- infrastructure uptime
- provider connectivity
- event queue/backlog
- business synthetic success
- reconciliation mismatches
- customer-visible exception backlog

## Post-incident learning

For every repeated incident class, add at least one of:
- earlier health probe
- schema/contract validation
- idempotency guard
- reconciliation check
- safer release gate
- clearer operator runbook
- provider fallback or queue isolation

The objective is not zero failures; it is that failures become visible, bounded, recoverable and progressively less surprising.
