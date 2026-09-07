# SUM Execution State Machine

The ecosystem is controlled as a graph of operational links, not a checklist of pages.

## Link states

`DESIGNED → PRESENT → WIRED → EXERCISED → MONITORED → RECOVERABLE → OPERATIONAL`

A link may fall back at any time:

`OPERATIONAL → DEGRADED → FAILED → RECOVERING → OPERATIONAL`

No status is permanent. Every status requires fresh evidence.

## Required evidence by state

- **DESIGNED** — contract/document exists.
- **PRESENT** — component/provider/account exists.
- **WIRED** — configuration/interface is connected.
- **EXERCISED** — a real test transaction crossed the link.
- **MONITORED** — success/failure signal is collected and queryable.
- **RECOVERABLE** — retry, rollback or manual exception path exists.
- **OPERATIONAL** — exercised + monitored + recoverable within agreed freshness window.
- **DEGRADED** — serving but SLA/latency/error/queue threshold breached.
- **FAILED** — critical function cannot complete.
- **RECOVERING** — automated/manual repair in progress and not yet revalidated.

## Whole-business heartbeat

The CEO-level heartbeat is not server uptime. It is the last successful traversal of these business paths:

1. `Discovery → public website → product detail`
2. `Product → cart → checkout`
3. `Checkout → payment → canonical order`
4. `Order → fulfilment → tracking → delivery`
5. `Delivery/order → activation → entitlement`
6. `Entitlement → member app → Tonight/Programme`
7. `Customer action → check-in → updated recommendation`
8. `Support/return/refund → payment/inventory reconciliation`
9. `Campaign → session → order attribution → reporting`

Each path stores:
- last_success_at
- last_failure_at
- consecutive_failures
- p95 latency where relevant
- last_event_id / correlation_id
- current_state
- owner/adapter
- next_retry_at
- unresolved_exception_id

## Criticality

### P0 — revenue / customer access stopped
Examples: storefront down, checkout cannot complete, paid orders lost, entitlement cannot activate.

### P1 — material degradation
Examples: tracking ingestion down, transactional emails delayed, analytics events missing but selling still works.

### P2 — non-critical defect
Examples: content sync delay, optional CRM enrichment or campaign tagging issue.

## Control loop

Every monitor cycle executes:

1. **Observe** — probes, events, queues, provider status, reconciliation deltas.
2. **Classify** — P0/P1/P2 and state transition.
3. **Contain** — prevent duplicate payment/order/entitlement or unsafe action.
4. **Recover** — retry, replay, rollback, switch adapter, or create exception.
5. **Verify** — rerun the exact broken path.
6. **Reconcile** — compare canonical state with external provider truth.
7. **Record** — append audit/recovery evidence.
8. **Learn** — if repeated, change test/threshold/workflow so the same class is detected earlier.

## Dependency ordering rule

Never polish a downstream component while the nearest upstream required link is FAILED or ABSENT.

Example:
- If public storefront is ABSENT, product-card polish is lower priority than establishing a public route.
- If Shopify has zero products, checkout styling is lower priority than catalogue ingestion.
- If payment webhook is unproven, fulfilment automation cannot be called operational.

## Synthetic transaction strategy

Staging must maintain non-money or provider-approved test personas/orders that can repeatedly validate the chain. Synthetic IDs are tagged and excluded from business KPIs.

Minimum synthetic tests:
- public homepage 200 + expected landmark
- product list non-empty when launch catalogue expected
- product detail resolvable by canonical SKU
- add-to-cart
- test checkout/payment where provider sandbox permits
- webhook signature rejection test
- webhook duplicate replay idempotency test
- order-to-entitlement test
- API readiness DB dependency test
- member assessment→Tonight→check-in loop

## Freshness rule

An old success does not prove current health. Each operational link defines a maximum evidence age. When evidence expires, state becomes `UNKNOWN` until rechecked; `UNKNOWN` is never rendered as green.
