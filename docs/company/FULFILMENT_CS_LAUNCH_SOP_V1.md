# Asclepios Sleep — Fulfilment + Customer Service Launch SOP V1

Status: OPERATING DRAFT — usable before final 3PL/payment/account activation
Owner: Amanda / CEO Office
Purpose: make fulfilment and customer support launch-ready before physical stock arrives.

## 1. Operating principle
Stock arrival must not be the point when the company starts designing operations. The commercial operating shell must exist first so final SKU, courier, payment and 3PL details can be plugged in without redesign.

Core flow:
ORDER CREATED -> PAYMENT STATUS -> STOCK CHECK -> FULFILMENT ROUTING -> PICK/PACK -> SHIPPED -> DELIVERY TRACKING -> DELIVERED -> CS / RETURN / REFUND / EXCEPTION -> REPORTING

## 2. Canonical order states
- DRAFT
- PENDING_PAYMENT
- PAID
- PAYMENT_FAILED
- ON_HOLD
- READY_TO_FULFIL
- ALLOCATED
- PICKING
- PACKED
- SHIPPED
- DELIVERED
- CANCELLED
- RETURN_REQUESTED
- RETURN_IN_TRANSIT
- RETURN_RECEIVED
- REFUND_PENDING
- REFUNDED
- PARTIAL_REFUND
- LOST_OR_DAMAGED_EXCEPTION

Rule: customer-facing language should be simpler than internal state names.

## 3. Fulfilment decision logic
### Before launch
Use one canonical routing interface even if the actual provider changes later.

Required fulfilment inputs:
- order ID
- customer name
- address
- country/region
- SKU + quantity
- paid/unpaid state
- shipping service
- gift/promo insert flag where applicable
- order notes

Routing rule:
1. If payment not cleared -> do not release fulfilment.
2. If SKU not allocated -> hold and create stock exception.
3. If address validation fails -> CS exception before dispatch.
4. If eligible for 3PL -> send to 3PL queue.
5. If manual fulfilment fallback enabled -> send to internal fulfilment queue.
6. Capture tracking number before order enters SHIPPED.

## 4. Inventory controls
Minimum fields per SKU:
- sellable stock
- reserved stock
- damaged/quarantine stock
- incoming stock
- safety stock threshold
- reorder point
- supplier lead time

Exception triggers:
- sellable stock below safety threshold -> replenishment alert
- paid order with no stock allocation -> urgent fulfilment exception
- stock mismatch between commerce and fulfilment records -> reconciliation task
- repeat damaged-item reports for same lot -> QA hold + supplier review

## 5. Shipping promise controls
Do not publish exact delivery promises until carrier/service is confirmed.

Before final launch, lock:
- UK standard service
- UK expedited service if offered
- international zones if enabled
- remote-area rules
- shipping fee policy
- free-shipping threshold if any
- dispatch cut-off time
- handling-day definition

Customer-facing copy must distinguish:
- order received
- preparing order
- dispatched
- carrier tracking
- delivered

## 6. Customer Service operating categories
All incoming cases should map to one primary category:
- PRE_PURCHASE_PRODUCT
- SUITABILITY_OR_SAFETY
- ORDER_STATUS
- PAYMENT
- ADDRESS_CHANGE
- CANCELLATION
- DELIVERY_DELAY
- LOST_OR_DAMAGED
- WRONG_ITEM
- MISSING_ITEM
- RETURN
- REFUND
- PRODUCT_QUALITY
- APP_OR_QR_ACTIVATION
- SUBSCRIPTION_OR_MEMBERSHIP
- COMPLAINT
- OTHER

## 7. CS response hierarchy
Tier 0 — automated/self-service:
- order status
- tracking link
- basic delivery ETA wording
- FAQ
- password/activation guidance

Tier 1 — AI-assisted response with deterministic policy guardrails:
- routine product questions
- order status explanation
- standard return/refund eligibility explanation
- address-change request before dispatch

Tier 2 — human/manager review:
- safety/medical red flags
- repeated product-quality issue
- chargeback/payment dispute
- complaint escalation
- exception refund outside policy
- suspected fraud
- legal/regulatory complaint

Rule: AI may explain approved policy; it must not invent exceptions or silently issue financial concessions beyond approved authority.

## 8. Return and refund framework
Final legal/consumer wording requires jurisdiction review, but operating states should exist now.

Return workflow:
REQUEST -> ELIGIBILITY CHECK -> RMA/INSTRUCTIONS -> RETURN IN TRANSIT -> RECEIVED -> INSPECTION -> REFUND/REJECT/PARTIAL -> CLOSED

Capture:
- reason code
- opened/unopened status where relevant
- product lot/SKU
- photo evidence if damaged/defective
- refund amount
- shipping refund amount if applicable
- responsible party
- resolution time

## 9. Exception playbooks
### Delivery delayed
- check carrier status
- give current factual status
- do not invent delivery date
- if beyond policy threshold -> escalate/remedy

### Lost shipment
- carrier check
- confirm address
- open carrier case if required
- replacement/refund only under approved policy

### Damaged item
- capture photos + lot/SKU
- create product-quality signal
- replacement/refund under approved policy
- repeated lot issue -> QA alert

### Wrong/missing item
- verify packed order vs order record
- replacement/correction workflow
- record fulfilment error KPI

### Safety complaint
- stop normal sales script
- advise discontinuation where relevant
- route to approved safety response
- never argue user into continued use

## 10. Launch dashboard minimum KPIs
Daily:
- orders
- paid orders
- failed payments
- unfulfilled paid orders
- orders shipped
- delivery exceptions
- returns requested
- refunds issued
- open CS cases
- oldest unresolved CS case

Weekly:
- order-to-dispatch time
- fulfilment error rate
- delivery exception rate
- return rate
- refund rate
- top 5 CS reasons
- repeat product-quality complaints
- stock cover / days on hand

## 11. Automation rules
- paid + stock available -> create fulfilment task automatically
- paid + no stock -> exception alert
- tracking added -> notify customer
- delivered -> start post-purchase / education sequence where permitted
- repeat CS issue -> Product/FAQ/Marketing review task
- return reason trend -> Product/QA review
- stock below threshold -> replenishment workflow
- unresolved high-severity CS beyond threshold -> management escalation

## 12. Owner decisions still required before live commerce
- chosen payment provider/account
- final 3PL/courier/fulfilment model
- exact shipping policy and fees
- final returns/refunds policy wording
- customer-service contact channels
- refund authority limits
- final SKU/pack/price/tax details

These decisions are plug-in points; the operating architecture should not wait for them.

## 13. Definition of ready
This workstream is launch-ready only when:
- product can be ordered end-to-end
- paid order reaches fulfilment queue
- tracking returns to customer
- stock decrements/reservations reconcile
- return/refund case can be completed
- CS can see customer/order context
- exception states generate alerts
- owner dashboard shows minimum KPIs
- fallback manual procedure exists if automation fails
