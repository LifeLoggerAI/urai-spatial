# UrAi Stripe test-mode integration

This document records TEST-MODE evidence only. It does not authorize or claim production billing, customers, revenue, Stripe approval, or a live checkout deployment.

## Stripe authority

- Current connected TEST account context: `acct_1Rpewx8HkbHala8x`
- Required runtime mode for this evidence: `URAI_STRIPE_MODE=test`
- All current catalog objects below were created/read with `livemode=false`.
- Earlier TEST account `acct_1Rpewk5ab9DrqB5j` and its objects are predecessor evidence only and must not be mixed with the current connected sandbox.

## Current test catalog

| Plan | Billing mode | Test product | Test price | Amount |
| --- | --- | --- | --- | ---: |
| `pro` | recurring monthly | `prod_VFOw6qUl8BmFSz` | `price_1UEu938HkbHala8xOETEzsP9` | `$10.00/mo` |
| `therapist` | recurring monthly | `prod_VFOw6qUl8BmFSz` | `price_1UEu9D8HkbHala8xaoW95vYg` | `$29.99/mo` |
| `founder` | one-time | `prod_VFOzlRr9uiGTAl` | `price_1UEuBr8HkbHala8xugI8Jdlp` | `$1.00 TEST smoke` |

The Pro and Therapist amounts reflect the current test integration target. The Founder amount is deliberately a provider-smoke value only because production Founder pricing is not source-authorized. None of these TEST objects are production billing authority.

Stable TEST lookup keys:

- `urai_monthly_10`
- `urai_monthly_2999`
- `urai_founder_test_smoke`

## Historical synthetic lifecycle evidence

The following synthetic lifecycle objects belong to predecessor TEST account `acct_1Rpewk5ab9DrqB5j` and remain historical diagnostics only:

- Synthetic customer: `cus_VCjCi3Z7JX2tUL`
- Synthetic Pro subscription: `sub_1UCJkN5ab9DrqB5jsSZSoaC0`
- Lifecycle exercised: `trialing -> canceled`
- Test invoice: `in_1UCJkN5ab9DrqB5jIUWX3l6i` (zero-dollar trial invoice)

They do not certify the current connected account. Fresh lifecycle evidence must be earned after an exact reviewed non-production deployment is bound to the current account.

No real customer identity or cardholder data is required for these receipts.

## Runtime environment contract

Never commit secret values. A non-production deployment must bind all of the following from the same Stripe test account/mode:

```text
URAI_STRIPE_MODE=test
STRIPE_SECRET_KEY=<test secret, provider secret store only>
STRIPE_WEBHOOK_SECRET=<test endpoint signing secret, provider secret store only>
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_1UEu938HkbHala8xOETEzsP9
NEXT_PUBLIC_STRIPE_PRICE_THERAPIST=price_1UEu9D8HkbHala8xaoW95vYg
NEXT_PUBLIC_STRIPE_PRICE_FOUNDER=price_1UEuBr8HkbHala8xugI8Jdlp
STRIPE_BILLING_PORTAL_CONFIGURATION=<test portal configuration once provider-side configuration exists>
```

`URAI_STRIPE_MODE` fails closed unless it is exactly `test` or `production`. Test evidence must never be copied into a production deployment receipt.

## Checkout authority

`/api/stripe/create-checkout-session`:

- requires a verified Firebase bearer token;
- derives `userId` only from that token;
- accepts only the server allowlist `pro`, `therapist`, `founder`;
- resolves Stripe Price IDs from server deployment configuration rather than request input;
- allowlists return URLs to the configured app origin;
- writes `userId`, `planId`, and explicit Stripe environment metadata;
- uses subscription Checkout for Pro/Therapist and one-time payment Checkout for Founder;
- does not grant entitlement from the success redirect.

## Webhook authority

Canonical routes:

- `/api/stripe/webhook`
- `/api/stripe/webhook-v2` (alias)

The handler requires raw request bytes, `Stripe-Signature`, `STRIPE_WEBHOOK_SECRET`, and Stripe signature verification. Supported state-bearing events are:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Durable event receipts are keyed by Stripe `event.id`. Processing records keep provider event creation time distinct from local processing time. Older events do not overwrite newer entitlement state, and same-timestamp cancellation cannot be resurrected by a non-cancellation event.

Founder one-time access is considered paid only when the verified Checkout Session reports `payment_status=paid`.

## Entitlement authority

`userEntitlements/{uid}` is server-owned. Firestore client rules do not grant client writes to that collection. The browser success URL is not settlement authority. Paid access is derived from verified server events.

Relevant states are `none`, `trialing`, `active`, `past_due`, `incomplete`, and `canceled`.

## Customer portal

`/api/stripe/create-portal-session` is server-authenticated. It resolves the Stripe customer from the authenticated user's server-owned entitlement record; callers cannot provide an arbitrary Stripe customer ID. Return URLs use the same origin allowlist as Checkout.

The current connected Stripe API surface lists no Billing Portal configuration and does not expose a create-configuration mutation. A provider-side TEST Billing Portal configuration remains required before this route can be exercised with an explicit `STRIPE_BILLING_PORTAL_CONFIGURATION` binding.

## Exact test procedure once a verified non-production endpoint exists

1. Deploy an exact reviewed source SHA to a non-production environment.
2. Verify `URAI_STRIPE_MODE=test` and the current account's test Price IDs are bound there.
3. Create a TEST webhook endpoint only for the verified HTTPS staging webhook URL.
4. Store its signing secret only in the approved provider secret mechanism.
5. Complete authenticated test Checkout with synthetic data.
6. Verify Stripe Checkout/subscription/invoice objects remain `livemode=false`.
7. Verify signed webhook delivery writes `userEntitlements/{uid}`.
8. Replay the same Stripe event and verify the durable receipt returns duplicate/no duplicate entitlement effect.
9. Exercise payment failure/recovery where provider tooling safely permits.
10. Cancel the synthetic subscription and verify entitlement revocation.
11. Verify customer portal authorization and cancellation behavior.
12. Cancel/clean any remaining synthetic active subscription.

## Current provider boundary

The current connected TEST account now has a complete three-plan catalog, but no verified non-production HTTPS Stripe webhook deployment with exact deployed SHA and current-account test-secret binding has been established in the available evidence. No webhook endpoint was created by guessing a staging URL. No TEST event is routed to production `urai.app`, and live billing remains unauthorized.
