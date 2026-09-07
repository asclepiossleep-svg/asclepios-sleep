# SUM Logic Pack 03 — Growth & Marketing Operating Logic

Status: binding v1  
Parent: `00_SUM_OPERATING_ECOSYSTEM.md`

## 1. Purpose

Growth is not a separate marketing department floating above the business. It is a closed loop from audience acquisition to revenue, product usage, retention and repeat purchase.

The system must connect creative activity to actual customer, order and retention outcomes.

## 2. Core loop

AUDIENCE / CHANNEL
→ campaign / content
→ landing page
→ product / education interaction
→ cart / checkout
→ order / payment
→ fulfilment / delivery
→ activation / product usage
→ customer outcome / support
→ CRM lifecycle
→ repeat purchase / referral
→ cohort / profitability analysis
→ campaign/product optimisation
→ next acquisition cycle.

## 3. Canonical campaign object

Every campaign/content asset should carry:
- campaign_id
- channel
- source
- medium
- creative_id
- content_asset_id
- product_family / SKU association where relevant
- audience / market
- language
- landing_url
- CTA
- claim_source / approval status where health/product claims are involved
- launch/start/end dates
- cost input where available
- owner
- status

## 4. Content object

Content is an operating asset, not just a file.

Minimum metadata:
- content_id
- type: video/article/image/email/social/landing/education
- language
- market
- audience
- four-domain tag where relevant
- product link where relevant
- funnel stage
- CTA
- claim approval/version
- source references
- publication status
- campaign links
- performance metrics

## 5. Funnel events

Minimum event chain:
- impression where available
- ad_click / content_click
- landing_view
- engaged_session
- product_viewed
- education_viewed
- assessment_started
- lead_captured where applicable
- add_to_cart
- checkout_started
- payment_succeeded
- order_created
- delivered
- activation_succeeded
- programme_started
- repeat_purchase
- referral_created where introduced

Every commercial event should retain campaign attribution when available.

## 6. Acquisition strategy architecture

SUM should support multiple channels through adapters rather than hard-code one platform:
- organic search / SEO;
- social content;
- paid social/search;
- creator/influencer/referral;
- partner campaigns;
- QR/offline packaging;
- CRM/email lifecycle;
- direct/repeat traffic.

New channels should plug into the same campaign/content/event model.

## 7. Website role

The public website is the central conversion and trust layer.

Required public functions:
- explain Asclepios Health clearly;
- present products and approved claims;
- connect physical products to Sleep Intelligence value;
- provide education/trust content;
- route to Shopify commerce;
- route existing customers to account/service;
- preserve campaign attribution;
- emit analytics events;
- support market/language routing.

The member app is not a substitute for the public website.

## 8. Shopify role

Shopify is the mature commerce engine for catalogue/cart/checkout/order-related functions unless later business evidence supports another architecture.

SUM must map Shopify identifiers to canonical Asclepios IDs and listen for relevant order/payment/fulfilment events through approved integration methods.

A Shopify product existing is not enough. Product data, availability, images, claims, checkout status and fulfilment readiness must agree with the canonical launch state.

## 9. CRM lifecycle

Lifecycle states should be derived from real behaviour, for example:
- visitor
- engaged visitor
- prospect / known contact
- first-time buyer
- delivered customer
- activated customer
- active service user
- inactive/lapsed
- repeat customer
- support-risk customer

Messaging must be triggered by canonical events/states, not manual lists where avoidable.

Example flows:
- cart abandonment;
- purchase confirmation;
- dispatch/tracking;
- delivery follow-up;
- activation reminder;
- programme engagement;
- replenishment/reorder;
- lapsed-user re-engagement;
- support recovery.

## 10. Growth measurement

Minimum management measures:
- sessions/traffic by source;
- landing→product-view rate;
- product-view→cart rate;
- cart→checkout rate;
- checkout→paid rate;
- paid→fulfilled/delivered rate;
- delivered→activated rate;
- activated→engaged service rate;
- repeat purchase rate;
- refund/return rate;
- support contacts per 100 orders;
- CAC input where spend exists;
- revenue and contribution inputs by campaign/channel/product;
- cohort retention.

## 11. Experimentation rule

Do not experiment on a broken funnel.

Before A/B or creative optimisation:
1. critical path must be operational;
2. analytics must be trustworthy;
3. attribution must be sufficiently stable;
4. test hypothesis and success metric must be explicit;
5. safety/claims/commercial rules must remain unchanged unless the experiment itself is approved for those dimensions.

## 12. Observability

Growth health is not impressions alone.

Health states must detect:
- landing page unavailable;
- attribution parameters lost;
- product unavailable unexpectedly;
- add-to-cart failure;
- checkout/payment failure spike;
- order event missing;
- CRM trigger missing;
- delivery/activation drop;
- campaign spend with zero measurable downstream event;
- broken links/creative destinations.

## 13. Recovery

Examples:
- broken landing link → stop/redirect affected campaign destination;
- product temporarily unavailable → switch CTA to waitlist/education, never fake stock;
- analytics loss → flag measurement outage and exclude period from optimisation decisions;
- CRM trigger failure → replay idempotently from canonical event ledger;
- payment/checkout outage → surface operational alert before increasing traffic.

## 14. Product/service feedback loop

Growth data must feed product operations:

campaign cohort
→ product purchased
→ activation
→ Sleep Intelligence engagement
→ support/returns
→ repeat purchase
→ insight.

This allows Asclepios to distinguish:
- campaigns that create low-quality traffic;
- products that sell but do not activate;
- customers that activate but do not engage;
- content that improves conversion/retention;
- cohorts with high support/return risk.

## 15. Acceptance test

For a staged campaign link, SUM should be able to trace:

campaign_id
→ landing visit
→ product view
→ cart
→ checkout
→ order
→ fulfilment
→ delivery
→ activation
→ service engagement
→ repeat/CRM state

with missing links explicitly visible rather than silently absent.