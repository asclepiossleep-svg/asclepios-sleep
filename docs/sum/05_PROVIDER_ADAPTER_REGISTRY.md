# SUM Provider / Adapter Registry

Status vocabulary:
- **ABSENT** — no implementation or account evidence.
- **PRESENT** — component/account exists but is not proven connected.
- **WIRED** — configuration/interface exists.
- **EXERCISED** — a real test has traversed the interface.
- **MONITORED** — failures are observable.
- **RECOVERABLE** — retry/rollback/operator path exists and has been tested.

A provider is never marked beyond the highest evidenced state.

| Domain | Preferred mature pattern | Current provider / component | Current evidence | State | Required next proof |
|---|---|---|---|---|---|
| Source control | Git + protected review flow | GitHub | Repo and PR flow accessible | WIRED | Required checks + no-direct-main workflow active |
| AI implementation | bounded issue-driven agent | Rex / Claude Code Action | manager/quota workflows exist | WIRED | new SUM branch/PR contract merged and exercised |
| Web hosting | preview → checks → production promotion | Vercel | deployment docs exist; provider intended | PRESENT | live preview URL + deployment check |
| Public storefront | public web shell independent of member login | AsclepiosHealth.com / Vercel | no proven public front door | ABSENT | reachable staging homepage with shop navigation |
| Commerce | hosted commerce API + webhooks | Shopify | connected store inspected; zero products at checkpoint | PRESENT | catalogue record → storefront → cart test |
| Commerce automation | trigger/condition/action workflows | Shopify Flow (optional) | not evidenced installed/configured | ABSENT | install only if useful; one non-critical workflow exercised |
| Database / auth | managed Postgres/Auth | Supabase | schema/deployment path designed | PRESENT | staging project + DB readiness probe pass |
| Event bridge | async webhook / edge receiver | Supabase DB Webhooks / Edge Functions or app API | canonical event taxonomy defined, transport incomplete | PRESENT | one event persisted + delivered + replayed |
| Payment | hosted checkout + signed webhook | Shopify Payments or approved Shopify-compatible provider | not selected/proven | ABSENT | sandbox/test payment → order event |
| Fulfilment | order adapter → 3PL → carrier tracking | provider TBC | canonical contract exists; real provider absent | ABSENT | test fulfilment accepted and tracking ingested |
| Email | transactional provider + templates + delivery events | provider TBC | dev OTP fallback exists; production mail not proven | ABSENT | confirmation email delivered in staging |
| CRM lifecycle | canonical customer + consent + event sync | provider TBC / Shopify customer data initially | contracts defined; external CRM not proven | PRESENT | customer/order event enters lifecycle flow |
| Product activation | signed/unique code → entitlement | Asclepios API/Supabase | tables/logic foundation exists; commerce bridge incomplete | PRESENT | qualifying order → code → entitlement end-to-end |
| Product intelligence | rules/state/feedback loop | Asclepios Sleep engine | assessment → Tonight → check-in/review implemented | WIRED | staging DB-backed E2E + observability events |
| Analytics | event taxonomy → warehouse/dashboard | provider TBC + canonical AnalyticsEvent | table exists; emission incomplete | PRESENT | funnel events emitted and queryable |
| Error monitoring | exception capture + alert + release correlation | provider TBC | console/error handler only | PRESENT | one synthetic exception captured and surfaced |
| Synthetic monitoring | scheduled HTTP/E2E probes | GitHub Actions now; Vercel Checks later | SUM workflow added on feature branch | WIRED | workflow active on main + real URLs configured |
| Backup / restore | scheduled backup + restore drill | repo scripts + Supabase/provider backup later | scripts exist | PRESENT | staging restore drill documented and passed |

## Mature-pattern policy

Use provider-native, well-established primitives before custom code:

1. Shopify owns catalogue/cart/checkout/order semantics where possible; Asclepios keeps canonical aliases/events rather than rebuilding a commerce platform.
2. Signed webhooks are the default bridge from provider state changes into Asclepios. Every consumer must be idempotent and replay-safe.
3. Supabase/Postgres is the Asclepios digital-state store; external provider IDs are aliases, not primary business identity.
4. Vercel preview deployments plus required checks are the release gate for web code.
5. External side effects use an inbox/outbox or equivalent durable event record before downstream action when loss/duplication matters.
6. Retries use bounded exponential backoff; repeated failure moves to a dead-letter/manual exception state rather than infinite retry.
7. Monitoring distinguishes **liveness**, **readiness**, **business transaction health**, and **provider health**.
8. No adapter may fabricate a green state when credentials, account access, endpoint or test data are missing.

## Adapter contract

Every external adapter must expose conceptually:

- `identify()` — provider/account/environment identity, without leaking secrets.
- `health()` — connectivity and dependency state.
- `ingest(event)` — validate signature/schema, deduplicate, persist receipt.
- `execute(command)` — idempotent outbound action using canonical IDs.
- `reconcile(cursor/window)` — compare provider truth with canonical records.
- `retry(failure)` — bounded retry policy.
- `deadLetter(failure)` — durable unresolved exception.
- `audit()` — immutable who/what/when/provider reference.

## Promotion rule

No adapter is production-ready until a synthetic or sandbox transaction proves:

`trigger → provider → webhook/event → canonical record → downstream consumer → observable success`

and a deliberate failure proves:

`failure → detection → retry/exception → operator visibility → recovery → reconciliation`.
