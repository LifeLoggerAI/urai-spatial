# UrAi Stripe test-mode integration

This document records TEST-MODE evidence only. It does not authorize or claim production billing, customers, revenue, Stripe approval, or a live checkout deployment.

## Stripe authority

- Account context: `acct_1Rpewk5ab9DrqB5j`
- Required runtime mode for this evidence: `URAI_STRIPE_MODE=test`
- All catalog objects below were created/read with `livemode=false`.

## Current test catalog

| Plan | Billing mode | Test product | Test price |
| --- | --- | --- | --- |
| `pro` | recurring monthly | `prod_VCjCRG7hVcM3Uk` | `price_1UCJjd5ab9DrqB5jpiNbPjJg` |
| `therapist` | recurring monthly | `prod_VCjdJizEN281Xe` | `price_1UCKAf5ab9DrqB5jkiWVNTNw` |
| `founder` | one-time | `prod_VCjeE6gWoGOyLD` | `price_1UCKAk5ab9DrqB5jg2IkXHcC` |

The nominal test prices are provider-smoke values and are not production pricing.

## Retained synthetic lifecycle evidence

- Synthetic customer: `cus_VCjCi3Z7JX2tUL`
- Synthetic Pro subscription: `sub_1UCJkN5ab9DrqB5jsSZSoaC0`
- Lifecycle exercised: `trialing -> canceled`
- Test invoice: `in_1UCJkN5ab9DrqB5jIUWX3l6i` (zero-dollar trial invoice)

No real customer identity or cardholder data is required for these receipts.

## Runtime environment contract

Never commit secret values. A non-production deployment must bind all of the following from the same Stripe test account/mode:

```text
URAI_STRIPE_MODE=test
STRIPE_SECRET_KEY=<test secret, provider secret store only>
STRIPE_WEBHOOK_SECRET=<test endpoint signing secret, provider secret store only>
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_1UCJjd5ab9DrqB5jpiNbPjJg
NEXT_PUBLIC_STRIPE_PRICE_THERAPIST=price_1UCKAf5ab9DrqB5jkiWVNTNw
NEXT_PUBLIC_STRIPE_PRICE_FOUNDER=price_1UCKAk5ab9DrqB5jg2IkXHcC
STRIPE_BILLING_PORTAL_CONFIGURATION=<optional test portal configuration>
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

A provider-side test Billing Portal configuration may still be required before this route can be exercised, depending on Stripe account settings.

## Exact test procedure once a verified non-production endpoint exists

1. Deploy an exact reviewed source SHA to a non-production environment.
2. Verify `URAI_STRIPE_MODE=test` and test Price IDs are bound there.
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

As of this receipt, no verified non-production HTTPS Stripe webhook deployment with exact deployed SHA and test-secret binding has been established in the available evidence. Do not create a Stripe webhook endpoint by guessing a staging URL, and do not route test Stripe events to production `urai.app` without explicit deployment/governance authority.
