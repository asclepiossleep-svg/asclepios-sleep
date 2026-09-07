# SUM Product Truth Governance

## Purpose

A connected ecosystem can spread bad data faster than a disconnected one. Product identity, commercial fields, claims and usage instructions therefore need a single authority order and explicit quarantine rules.

## Authority order

Highest wins when sources conflict:

1. **Owner-confirmed final production / legal / factory specification** — final pack, SKU, price, tax, barcode, dimensions, approved claims and launch market.
2. **Latest owner-confirmed Phase-1 printed catalogue / digest** — current product identity and product format, but any field explicitly marked provisional remains non-commercial.
3. **SUM canonical product record** — normalized operational representation of the latest verified source.
4. **Shopify DRAFT product** — downstream commerce projection; never an authority over the canonical source.
5. **Website / CRM / CS / Sleep Intelligence copy** — projections derived from approved canonical fields.
6. **Historical project docs / old memory / superseded drafts** — reference only; never sync automatically.

## Current Phase-1 canonical identity

| Code | Current identity | Product form | Commercial state |
|---|---|---|---|
| P01 | SLEEPTAPE™ Nasal Strips | Nasal strip | COMING_SOON / commercial fields unconfirmed |
| P02 | DAY MODE™ | Daytime drink-powder product line | COMING_SOON / commercial fields unconfirmed |
| P03 | REST & SLEEP MODE™ | Night-time drink-powder product line | COMING_SOON / commercial fields unconfirmed |

## Critical quarantine

`docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md` and any related mouth-tape implementation field map are **STALE FOR PRODUCT IDENTITY** if they describe Sleep Tape as an oral/mouth adhesive or lips-together product.

Reason: the latest confirmed Phase-1 catalogue superseded the earlier 4-SKU memory and identifies SLEEPTAPE™ as the nasal-strip product. No website, Shopify description, customer-service answer, Sleep Intelligence rule or marketing asset may derive product identity/claims from the stale mouth-tape object.

Historical files may remain in Git for audit/history, but consumers must treat them as quarantined until rewritten against the latest physical-product specification.

## Commercial-field rule

The following values are never inferred:
- retail price;
- VAT/tax treatment;
- SKU/barcode;
- inventory quantity;
- launch date;
- shipping charge/SLA;
- pack dimensions/weight;
- entitlement duration;
- returns policy;
- regulatory/health claim approval.

Until owner/supply-chain confirmation, the canonical operational state is:
- `priceCents = null`
- `active = false`
- `lifecycleState = COMING_SOON`
- Shopify `status = DRAFT`
- storefront purchase action disabled.

Legacy provisional prices in seed/history are not approved commercial truth. `commercialLaunchGuard.ts` is the runtime safety net that prevents those values from becoming sellable state during deploy/demo reseeds.

## Current Shopify projection

Connected Shopify DRAFT records created as a safe downstream projection:

- SLEEPTAPE™ Nasal Strips — `gid://shopify/Product/15937209663872`
- DAY MODE™ — `gid://shopify/Product/15937209696640`
- REST & SLEEP MODE™ — `gid://shopify/Product/15937209762176`

Shopify-generated default variant price `0.00 GBP` is a platform placeholder on DRAFT records, not an Asclepios selling price.

## Claim pipeline

Any health/product statement moves through:

`source/evidence → claim candidate → safety/regulatory review → approved claim version → canonical product truth → website/Shopify/CS/CRM/Intelligence projections`

Every projection should be traceable to `claims_version_id` (or equivalent future canonical field). A downstream channel may shorten approved wording but may not strengthen it.

## Product-sync gate

A product may move from DRAFT/COMING_SOON to sellable only when all required gates have evidence:

1. identity / physical specification confirmed;
2. pack/SKU/barcode confirmed as applicable;
3. price/currency/tax confirmed;
4. approved product claims/copy;
5. stock/location truth connected;
6. shipping/returns policy available;
7. payment/checkout path exercised;
8. fulfilment path exercised;
9. customer confirmation/support path exercised;
10. monitoring/reconciliation active.

No single provider status (e.g. Shopify ACTIVE) is sufficient to release a product.

## Cross-system drift check

The monitoring loop must compare at minimum:
- canonical product identity vs Shopify title/status;
- canonical lifecycle state vs public storefront purchaseability;
- approved price version vs Shopify variant price before launch;
- stock/location truth vs Shopify availability;
- approved claim version vs channel copy revision;
- qualifying SKU entitlement rule vs activation system.

A conflict becomes `PRODUCT_TRUTH_DRIFT`, blocks automatic publication and creates an operator exception.
