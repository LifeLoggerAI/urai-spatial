# URAI Commercial / Entitlement Authority

Status: CURRENT PROVIDER READBACK + SOURCE CONTRACT

Date: 2026-09-19

## Current live Stripe product truth

Connected LIVE Stripe account readback establishes:

Product:
- `UrAi Subscription`
- recurring subscription service
- metadata identifies production / system=urai

Active production prices:
- Pro — USD $10.00 / month
  - lookup key: `urai_pro_monthly_10`
  - plan key: `pro`
- Therapist — USD $29.99 / month
  - lookup key: `urai_therapist_monthly_2999`
  - plan key: `therapist`

## Current customer portal truth

One active default LIVE Billing Portal configuration exists:
- name: UrAi Production Customer Portal
- default return: https://urai.app/
- customer updates: email, name, address
- invoice history: enabled
- payment-method update: enabled
- subscription cancel: enabled at period end
- subscription pause: disabled
- subscription update: disabled
- login page: disabled

## Current webhook truth

LIVE Stripe webhook endpoints: **zero**.

Therefore:
- prices exist;
- product exists;
- portal configuration exists;
- live webhook-based entitlement synchronization is not proven complete.

## Repository entitlement model

Current Spatial source contains plan IDs:
- free
- pro
- therapist
- founder

Checkout source expects environment-bound Stripe price IDs for Pro, Therapist and Founder.

Provider readback on 2026-09-19 shows only the Pro and Therapist active production prices above. No active Founder price was returned in the current live price list.

## Canonical commercial classification

- FREE: canonical plan concept, no recurring provider price required.
- PRO: VERIFIED LIVE PRICE, $10/month.
- THERAPIST: VERIFIED LIVE PRICE, $29.99/month.
- FOUNDER: SOURCE PLAN ID EXISTS / CURRENT LIVE PRICE NOT VERIFIED.

## Launch / safety boundary

Do not infer from price existence that:
- checkout is production-accepted;
- webhook delivery works;
- Firestore entitlement writes are live-correct;
- UI unlock refresh is proven;
- refunds/cancellations/end-of-term changes are fully synchronized.

Commercial production sequence remains:
verified seller/operator
-> Stripe seller/payout identity
-> product/prices
-> webhook endpoint/signing secret
-> TEST checkout
-> entitlement write
-> UI entitlement refresh
-> negative/no-entitlement remains locked
-> explicit LIVE billing decision.

No LIVE billing mutation was performed by this canon recovery.

## Copy authority

Public pricing copy may state the two verified active live price points only when the product/release owner has authorized public billing display:
- Pro: $10.00/month
- Therapist: $29.99/month

Do not publish a Founder price without current provider evidence.
