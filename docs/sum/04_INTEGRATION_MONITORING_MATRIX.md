# SUM Integration & Monitoring Matrix

Status: execution control v1  
Purpose: convert architecture into testable, monitorable business motion.

## 1. Rule

Every row below must eventually move from GREY/AMBER to GREEN through evidence. Design alone is never GREEN.

| Chain | Source | Destination | Engine / Provider | Trigger | Evidence of motion | Health check | Failure handling | Current state |
|---|---|---|---|---|---|---|---|---|
| Traffic → Site | Ads/Search/Social/QR/Direct | Public web | Vercel + domain | visit/click | HTTP + landing event | page reachable, latency, 5xx | alert + rollback/fallback | RED: public commercial front door not evidenced |
| Site → Product | Public web | Product detail | Web + catalogue adapter | product click | product_viewed | valid product payload/render | fallback unavailable state | RED/AMBER |
| Product → Cart | Product page | Shopify cart | Shopify | add-to-cart | cart ID + event | action succeeds | visible error + retry | GREY |
| Cart → Checkout | Shopify cart | Shopify checkout | Shopify | checkout | checkout token/url | checkout reachable | provider error state | GREY |
| Checkout → Payment | Shopify | payment provider | approved payment engine | pay | success/failure event | webhook/result received | idempotent retry/reconcile | GREY |
| Payment → Order | payment event | canonical order | Shopify + Asclepios mapping | payment/order webhook | unique order created | no duplicate/missing order | idempotency + exception queue | GREY |
| Order → Inventory | canonical order | inventory ledger | Shopify/warehouse adapter | paid/reserved | stock reservation/update | stock delta consistent | reconcile | GREY |
| Order → Fulfilment | canonical order | 3PL/warehouse | selected partner | ready-to-fulfil | acknowledgement/ref | SLA timer | retry/escalate/manual bridge | GREY: provider not selected |
| Fulfilment → Shipment | 3PL | courier/tracking | carrier/3PL | dispatch | tracking ID | tracking valid | exception state | GREY |
| Shipment → Delivery | carrier | customer/order | carrier events | delivered/exception | delivered event | stale tracking/exceptions | support workflow | GREY |
| Order → Activation | qualifying order/product | QR/code | Asclepios activation | code issued | activation record | unique, valid SKU/order/batch | reject duplicate/invalid | AMBER: data/service foundation exists |
| Activation → Entitlement | activation | member service | Asclepios | activation success | entitlement active | correct start/end/state | rollback/reconcile | AMBER |
| Entitlement → Sleep | entitlement/profile | Tonight/Day plan | Asclepios decision engine | plan generation | plan + reason/version | 1–3 valid actions | safe fallback/exception | AMBER/GREEN for non-commerce app slice |
| Tonight → Feedback | user actions | Morning check-in | Asclepios app/API | completion/wake | persisted check-in | downstream state changes | retry/preserve state | GREEN/AMBER |
| Feedback → Review | check-ins/history | 7d/28d logic | decision engine | review window | review snapshot | replayable result | exception | 7d GREEN; 28d AMBER |
| Order/Service → Support | user/contact | support case | CRM/helpdesk TBC | contact/exception | linked case | order/customer lookup | manual escalation | GREY |
| Return → Refund | support/return | payment + stock | Shopify/payment/warehouse | return accepted | refund + inventory state | reconciliation | exception queue | GREY |
| Events → CRM | canonical event stream | CRM | provider TBC | lifecycle event | contact/state/action | trigger arrival | replay | GREY |
| Events → Reporting | all systems | dashboard | canonical analytics | event/state | metric updated | freshness/completeness | flag outage/rebuild | RED/AMBER |
| Code → Deploy | GitHub | Vercel | CI/CD | PR/merge/deploy | deployment | CI + synthetic check | rollback | AMBER |
| Platform → Alert | all critical services | Amanda/ops | monitoring provider + SUM | error/SLA breach | alert/incident | probe cadence | retry/escalate | RED/AMBER |

## 2. Health evidence standard

A row can become GREEN only when evidence contains:

- test or transaction ID;
- timestamp;
- observed source state;
- observed destination state;
- expected event/log;
- pass/fail result;
- recovery path tested for critical links where practical.

## 3. First operational test path

The first end-to-end commerce test should use non-production/test-safe settings:

1. public staging homepage opens;
2. approved catalogue product is visible;
3. user opens product page;
4. product can enter cart;
5. checkout path is reachable in safe/test mode;
6. successful/failed payment behaviour is mapped without real unintended charge;
7. unique order is observed;
8. fulfilment handoff is simulated or sent to test endpoint until 3PL selected;
9. customer confirmation state is observed;
10. qualifying activation code can be issued in staging;
11. activation creates entitlement;
12. member area sees entitlement;
13. Sleep Intelligence can consume product/entitlement state;
14. each transition appears in event/health reporting.

## 4. Synthetic monitoring cadence

Suggested baseline after staging is online:

- website reachability: every 5–15 minutes via platform/monitoring provider;
- API health: every 5–15 minutes;
- catalogue/cart synthetic: hourly;
- checkout reachability synthetic: hourly without charging;
- webhook/event backlog: every 15 minutes;
- order→fulfilment latency: event-driven + hourly exception scan;
- tracking stale/exception: hourly/daily based on SLA;
- activation failures: event-driven + daily trend;
- CRM/event delivery backlog: hourly;
- dashboard data freshness: hourly;
- backup verification: daily schedule, periodic restore test.

Actual schedules should be implemented with the chosen providers and operational cost limits; these are control targets, not claims that monitoring already exists.

## 5. Debug record

Each material failure should record:

- incident_id
- chain/link
- detected_at
- detection_source
- affected IDs/orders/users
- symptom
- root cause category
- provider/system
- retry attempts
- recovery action
- recovered_at
- verification evidence
- preventive change

## 6. Current evidence-backed baseline

From the current repository and connected Shopify state:

- authenticated member app vertical slice exists;
- public commercial website/front door is not yet evidenced as operational;
- connected Shopify store currently has zero products;
- payment provider integration is not implemented in the repo baseline;
- QR/activation data/service foundation exists but is not fully connected to purchase/UI;
- AnalyticsEvent data model exists, but broad funnel emission/monitoring is not complete;
- CDN/media delivery remains incomplete;
- 7-day review exists; 28-day trend/pattern-change logic remains partial.

This baseline prevents previously built pieces from being mistaken for a fully operational business.

## 7. Next implementation tickets generated from this matrix

P0.1 Public storefront shell and routing separation from member app  
P0.2 Catalogue adapter + approved 3-product ingestion into Shopify as safe draft/non-purchasable state until commercial fields are confirmed  
P0.3 Product page/cart/checkout staging flow  
P0.4 canonical event ledger + funnel event emission  
P0.5 payment/order webhook contract + idempotency  
P0.6 fulfilment adapter contract + test/mock endpoint before partner selection  
P0.7 operational health endpoint/dashboard skeleton  
P1.1 QR activation UI + entitlement integration  
P1.2 product ownership consumption in Sleep Intelligence  
P1.3 CRM adapter/lifecycle event mapping  
P1.4 returns/refund reconciliation  
P1.5 alert/retry/exception queue implementation

Each ticket is accepted only when its corresponding matrix row is measurably healthier.