# SUM Real-World Operations Map

Software is not the whole operating system. Every digital state transition that requires a physical, financial, legal or human action must terminate in a named operational role/provider and return evidence to the digital spine.

## 1. Product supply → sellable inventory

`Manufacturer → QA/release → freight/import → receiving warehouse → inventory location → Shopify sellable stock`

Required real-world owner/provider classes:
- contract manufacturer / finished-goods supplier;
- product QA / release authority appropriate to the launch market;
- freight forwarder / customs broker when cross-border;
- importer of record where required;
- warehouse / 3PL receiving location;
- packaging / label / QR print supplier.

Digital evidence required:
- purchase/batch reference;
- SKU + lot/batch + expiry where applicable;
- quantity shipped / received / quarantined / available;
- receiving discrepancy;
- release status;
- stock-location identity.

No stock becomes sellable merely because a spreadsheet says it exists.

## 2. Customer order → parcel

`Shopify paid order → canonical order → fulfilment request → pick → pack → ship → carrier tracking → delivery event`

Required provider classes:
- Shopify commerce;
- approved payment service through Shopify;
- 3PL/warehouse;
- parcel carrier(s);
- address-validation capability if needed.

Minimum returned evidence:
- provider fulfilment ID;
- accepted/rejected timestamp;
- picked/packed timestamp where supplied;
- carrier + tracking number;
- first scan;
- delivered/exception state.

Control: a browser "thank you" page is never payment truth; a fulfilment request is never shipment truth; a tracking number without a carrier acceptance scan is not delivery evidence.

## 3. Physical product → digital service

`Order/SKU → QR code issue → print/batch bind → customer scan → activation validation → entitlement → member experience`

Operational parties:
- Asclepios activation service;
- packaging/QR print process;
- warehouse if QR/batch association occurs during packing;
- customer support for damaged/missing/unreadable codes.

Controls:
- code uniqueness;
- issuance/audit before printing;
- no activation beyond allowed rule;
- replay/duplicate scan safety;
- expiry/revocation;
- support recovery path linked to order and batch.

## 4. Returns / refunds

`Customer request → support case → return authorization → carrier/return address → received inspection → stock disposition → refund → finance reconciliation`

Real-world decisions that must be confirmed before production:
- return window;
- return address / 3PL return service;
- unopened/opened product policy;
- damaged product evidence policy;
- who can approve exception refunds;
- disposal/quarantine/restock rules.

Digital evidence:
- RMA/return ID;
- item quantities;
- received condition;
- disposition;
- refund provider reference;
- inventory adjustment reference.

## 5. Customer support

Entry points eventually include website contact, transactional-email replies and other approved channels.

Every material case must resolve to canonical objects:
`customer_id / order_id / shipment_id / activation_code / entitlement_id / payment_ref`

Do not allow support to become an untraceable side conversation.

Escalation classes:
- order/payment;
- delivery;
- product/packaging;
- activation/account;
- safety/content concern;
- privacy/data request;
- refund/return;
- technical app issue.

## 6. Finance / accounting

`Payment capture → Shopify order → payment ledger → refunds/fees/tax/shipping → settlement → bank → accounting/reconciliation`

Provider/accounting package is a commercial owner decision, but the integration contract is not optional.

Daily controls:
- captured sales vs paid orders;
- refunds vs refund ledger;
- provider fees;
- settlement amount vs bank receipt;
- unmatched transactions;
- tax classification completeness.

## 7. Marketing → customer → revenue

`Campaign/creator/ad → tagged landing → session → product view → cart → checkout → order → repeat purchase`

External parties may include:
- paid-ad networks;
- creators/affiliates;
- email/SMS platform;
- agencies.

Each campaign/partner needs canonical source/campaign/creative/landing identifiers so spend and commission can reconcile to revenue.

## 8. Product / claim / content governance

Before publishing product-specific health copy:
- source/evidence owner;
- approved claim version;
- market/language;
- approver;
- effective/expiry date;
- associated SKU/content IDs.

Public copy, CRM copy, support scripts and Sleep Intelligence product hooks must all reference the approved claim version rather than independently invent wording.

## 9. Real-world provider onboarding gate

Before any provider is treated as operational:
1. commercial owner approves provider and spend;
2. account ownership/admin access recorded;
3. sandbox/test environment where available;
4. data fields/API/webhooks mapped to SUM canonical contract;
5. security/privacy review appropriate to data handled;
6. one success transaction exercised;
7. one failure/retry path exercised;
8. reconciliation test completed;
9. support/escalation contact recorded;
10. offboarding/export path documented.

## 10. CEO operational heartbeat

The management view must combine software and real-world facts:
- storefront reachable;
- catalogue valid;
- checkout/payment health;
- paid orders awaiting fulfilment;
- fulfilment acceptance latency;
- shipments without first scan;
- late/damaged/lost exceptions;
- stock at risk / quarantined;
- activation failures;
- entitlement failures;
- support backlog;
- refunds pending;
- settlement mismatch;
- campaign conversion;
- repeat purchase;
- unresolved P0/P1 incidents.

A green website with unshipped paid orders is RED at CEO level.
