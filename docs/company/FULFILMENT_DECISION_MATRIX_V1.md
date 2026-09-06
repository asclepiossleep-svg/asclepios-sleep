# Asclepios Sleep — Fulfilment Decision Matrix V1

Owner: Amanda
Status: WORKING — launch-critical decision support
Last verified: 2026-09-06
Priority: BUSINESS LAUNCH FIRST

## Executive decision

**Provisional launch route:** use a specialist UK 3PL as the primary owned-site fulfilment route, with **ShipBob UK as the current lead candidate**, and keep **Amazon FBA/MCF as a secondary/hybrid route** once Amazon is an active channel or its economics become clearly superior.

Why this is the current lead:
- Asclepios intends to sell both non-consumable Sleep Tape and consumable wellness SKUs such as magnesium/probiotic products.
- Consumables create a hard requirement for lot/batch visibility, expiry control, recall traceability and FEFO/FIFO handling.
- ShipBob explicitly publishes UK health/wellness capability including lot tracking, expiry-date management, FEFO, recall isolation, custom packaging, subscriptions, DTC + marketplace/retail fulfilment, and UK/EU/global locations.
- Amazon MCF is operationally attractive and transparent, but should not become the canonical operating model before SKU eligibility, expiry/lot handling, packaging/brand experience and final unit economics are confirmed for each launch SKU.
- Huboo is a credible UK alternative with broad integrations and operational dashboarding, but its public entry point of **from £1,000/month** is a material launch-stage commercial threshold and its public pages reviewed here do not establish the same level of explicit supplement lot/expiry/FEFO detail as ShipBob.

This is **not yet a final vendor award**. It is the route Amanda should now design the commerce data contract around so engineering and launch operations can proceed without waiting for a commercial contract.

---

## 1. Non-negotiable Asclepios requirements

### A. Universal fulfilment requirements
- accept canonical Asclepios order ID and SKU/quantity;
- receive paid orders through API/native integration/middleware without manual re-keying;
- return fulfilment state + carrier + tracking;
- maintain inventory position and inventory-adjustment events;
- surface exceptions rather than silently failing;
- support returns receipt and disposition;
- support branded or at minimum non-conflicting packaging;
- export data so Asclepios remains system-of-record capable and is not locked into a warehouse dashboard.

### B. Consumable SKU requirements — launch critical for magnesium/probiotic
- lot/batch code captured at receiving;
- expiry date captured at receiving;
- FEFO preferred for dated consumables;
- order-to-lot traceability;
- recall/quarantine workflow;
- damaged/returned consumables disposition rules;
- shelf-life acceptance rule before receiving;
- temperature/storage requirements supported where final product specification requires them.

### C. Customer experience requirements
- UK delivery proposition understandable before checkout;
- dispatch/tracking event returned promptly;
- branded inserts/custom packaging supported if commercially sensible;
- delivery exception visible to CS;
- return path documented before launch.

---

## 2. Candidate matrix

Scoring scale: 5 = strong/explicitly supported; 3 = plausible but quote/diligence required; 1 = weak/poor fit. Scores are decision-support, not contractual facts.

| Criterion | ShipBob UK | Amazon FBA / MCF | Huboo |
|---|---:|---:|---:|
| UK DTC launch fit | 5 | 4 | 4 |
| Low-volume launch flexibility | 3 | 5 | 2 |
| Public fee transparency | 2 | 5 | 3 |
| Health/wellness specialisation | 5 | 3 | 3 |
| Lot / expiry / FEFO | 5 | 3* | 3* |
| Recall traceability | 5 | 3* | 3* |
| Branded/custom packaging | 5 | 3 | 4* |
| Amazon channel compatibility | 5 | 5 | 5 |
| Owned-site integrations | 5 | 4 | 5 |
| API / system connectivity | 5 | 5 | 4* |
| Returns workflow | 5 | 4 | 4* |
| International expansion | 5 | 4 | 4 |
| Subscription readiness | 5 | 3* | 3* |
| Launch-stage commercial risk | 3 | 5 | 2 |
| **Current Amanda fit** | **LEAD** | **HYBRID / SECONDARY** | **ALTERNATIVE** |

`*` = not sufficiently verified for Asclepios' exact SKU/operating requirement from the public material reviewed; must be answered in vendor diligence.

---

## 3. Verified provider facts

### ShipBob UK — current lead candidate
Verified from ShipBob UK public material on 2026-09-06:
- 50+ fulfilment locations across UK/EU/US/Canada/Australia are advertised globally, with UK fulfilment available.
- 50+ few-click integrations plus a developer API are advertised; major platforms include Shopify, BigCommerce, WooCommerce, Amazon, eBay, Squarespace, Wix and Square.
- Health/wellness pages explicitly state lot tracking and expiration-date management.
- FEFO picking is explicitly described for dated consumables.
- Lot codes used in individual orders are tracked; recall workflows can identify/isolate affected lots.
- Returns for lot-controlled products can be disposed, quarantined or, in limited cases, restocked according to merchant rules.
- Custom packaging/inserts and subscription fulfilment are supported.
- DTC and B2B can be fulfilled from a shared inventory pool.
- Pricing is quote-based on the public UK pages reviewed.

**Amanda view:** strongest currently verified fit for a mixed physical-wellness launch because it solves the hardest Asclepios requirement — consumable traceability — without forcing Amazon to become the operating centre of gravity.

### Amazon Multi-Channel Fulfilment — strongest low-friction secondary route
Verified from Amazon UK MCF public material on 2026-09-06:
- fulfilment pricing starts at **£3.26 per unit**;
- storage pricing starts at **£0.56 per cubic foot**;
- pick, pack and ship are included in the published fulfilment fee structure;
- no long-term contracts are advertised;
- multi-unit order discounts of up to 25% are advertised;
- standard 2–3 day and expedited 1-day fulfilment are available in published integration material;
- a 1.5% fuel/logistics-related surcharge applies to UK MCF fulfilment fees from 2 May 2026;
- Amazon documents integrations/middleware that can automate order routing, inventory synchronisation and tracking for off-Amazon orders;
- unbranded packaging capability is available in supported MCF flows.

**Amanda view:** keep this path open from day one because it may be the fastest route for low-volume launch and is strategically useful once Amazon becomes a meaningful sales channel. Do not choose it as sole fulfilment architecture until consumable-lot/expiry handling and Asclepios packaging/returns requirements are confirmed SKU by SKU.

### Huboo — credible UK alternative
Verified from Huboo public material on 2026-09-06:
- public site advertises **35+ integrations**;
- dashboard visibility includes goods-in, channel sales/listings, courier tracking, inventory, costs and billing;
- public site advertises launch pricing **from £1,000 per month**;
- integrations include Shopify, Amazon, eBay, Temu and TikTok Shop UK among others;
- Huboo positions services for startups/SMEs as well as larger businesses.

**Amanda view:** operationally credible, but the public £1,000/month floor makes it less attractive for a low-volume first launch unless the quote includes enough value to beat variable-cost alternatives. Product-specific batch/expiry/FEFO controls must be explicitly confirmed before shortlist promotion.

---

## 4. Recommended launch architecture

### Phase 0 — build now, vendor independent
Asclepios owns the canonical records:

`Order -> OrderEvent -> Payment -> Fulfilment -> Shipment -> InventoryAdjustment -> Return -> Refund -> CSCase`

The warehouse is an execution provider, not the business source of truth.

Minimum outbound fulfilment instruction:
```yaml
fulfilment_request:
  order_id: ASC-...
  warehouse_route: provider_code
  customer:
    recipient_name: ...
    address: ...
    email: ...
    phone: ...
  service_level: standard|expedited
  lines:
    - sku: ASC-...
      quantity: 1
  packaging_profile: standard|branded
  customer_note: optional
```

Minimum inbound provider event:
```yaml
fulfilment_event:
  order_id: ASC-...
  provider_reference: ...
  status: queued|picking|dispatched|delivery_exception|delivered|return_received|failed
  occurred_at: ISO-8601
  carrier: ...
  tracking_number: ...
  exception_code: optional
  inventory_adjustments:
    - sku: ASC-...
      quantity_delta: -1
      reason: shipment
      lot_code: optional
      expiry_date: optional
```

### Phase 1 — UK owned-site launch
- primary: specialist 3PL if quote/onboarding passes launch gates;
- fallback: Amazon MCF for eligible SKUs if specialist 3PL onboarding would delay launch;
- retain Asclepios order ID in all provider references/metadata where available.

### Phase 2 — Amazon channel active
- use FBA for Amazon-native demand if commercially appropriate;
- maintain either (a) separate 3PL + FBA pools with reconciliation, or (b) MCF as shared inventory only if brand, consumable traceability and economics remain acceptable;
- Asclepios database continues to reconcile channel inventory and exceptions.

### Phase 3 — international expansion
- move inventory regionally only when order density supports it;
- do not prematurely distribute stock across multiple countries before demand signal, tax/VAT and regulatory routes are confirmed.

---

## 5. Quote / diligence questionnaire — send unchanged to shortlisted 3PLs

### Commercial
1. All onboarding/setup fees?
2. Monthly minimum spend or minimum orders?
3. Receiving fee by carton/pallet/unit?
4. Storage basis and rate?
5. Pick fee first unit + additional unit?
6. Packaging/material charge?
7. Carrier/postage rates for target parcel dimensions?
8. Returns processing fee?
9. Account-management/software/API fees?
10. Peak surcharge, fuel surcharge, remote-area or other pass-through charges?
11. Exit/stock-removal fees and contract notice period?

### Operations
12. Typical onboarding lead time from signed agreement to first live order?
13. Receiving SLA and same-day/next-day dispatch cut-off?
14. Dispatch SLA and measured accuracy rate?
15. Supported carriers/services in UK?
16. Delivery-exception data available by API/webhook/export?
17. Lost/damaged claim workflow and liability?
18. Can we use our own branded mailers/boxes/inserts?
19. Can specific SKUs use different packaging profiles?
20. How are customer cancellations handled after order submission but before pick?

### Consumables / traceability
21. Do you capture lot/batch code and expiry at goods-in?
22. Can you enforce FEFO by SKU?
23. Can you return the shipped lot code against each order line?
24. Minimum remaining shelf-life requirement at receiving?
25. Recall/quarantine process and retrieval time for affected customer/order list?
26. Return disposition rules for sealed consumables vs opened/damaged goods?
27. Temperature/humidity controls, if needed by final SKU spec?
28. Relevant quality/GMP/GFSI or other site certifications for the proposed UK warehouse?

### Systems
29. Native integration for final commerce platform?
30. REST/API or webhook support for order create/cancel/status/tracking/inventory/returns?
31. Idempotency or duplicate-order protection?
32. Inventory webhooks or polling frequency?
33. Sandbox/test environment?
34. CSV/manual contingency route if integration fails?
35. Can our canonical order ID be stored and returned on all events?

---

## 6. Acceptance test before any provider is declared launch-ready

Run one real or controlled test per launch SKU/pack profile:
1. create order in Asclepios;
2. successful payment -> PAID;
3. exactly one fulfilment instruction created;
4. warehouse acknowledges without duplicate;
5. order advances to PICKING/DISPATCHED;
6. tracking comes back into Asclepios;
7. inventory decrements correctly;
8. consumable order preserves expected lot/expiry traceability;
9. delivery exception can be surfaced to CS;
10. return path is exercised or provider evidence is documented;
11. refund is linked to original order/payment and does not corrupt inventory;
12. owner dashboard shows any exception without requiring warehouse-dashboard inspection.

Launch gate is **not** simply “provider account connected.” It is successful end-to-end order + inventory + exception visibility.

---

## 7. Decision threshold for Edmund

Do **not** interrupt Edmund yet. Amanda can continue vendor-independent architecture and diligence preparation.

Bring a grouped owner decision only when at least two realistic quotes/onboarding paths exist or stock date makes one route time-critical. Present only:
- all-in landed fulfilment cost for representative 1-unit and 2-unit baskets;
- monthly minimum/fixed commitment;
- onboarding time;
- traceability/compliance fit for consumables;
- packaging/brand control;
- system integration fit;
- recommendation + fallback.

Until then: **ShipBob = lead diligence candidate; Amazon MCF = launch fallback/hybrid; Huboo = alternative quote.**

---

## 8. Sources verified 2026-09-06

Official sources used for this checkpoint:
- Amazon MCF UK pricing: https://supplychain.amazon.co.uk/pricing
- Amazon MCF integration examples: https://supplychain.amazon.co.uk/integrations/webflow and https://supplychain.amazon.co.uk/integrations/pipe17
- ShipBob UK: https://www.shipbob.com/uk/
- ShipBob UK integrations/API: https://www.shipbob.com/uk/product/apps-api/
- ShipBob UK health & wellness: https://www.shipbob.com/uk/categories/health-and-wellness/
- ShipBob UK health & nutrition: https://www.shipbob.com/uk/industry/health-and-nutrition/
- Huboo: https://huboo.com/
- Huboo integrations: https://huboo.com/fulfilment/integrations/

## Next Amanda checkpoint
1. build commerce exception/alert model around this provider-independent data contract;
2. define department/permission responsibilities for payment, fulfilment, returns/refunds, CS and owner escalation;
3. once launch platform direction is fixed, turn the fulfilment contract into engineering tickets without coupling the business schema to one vendor.
