# URAI Spatial Launch Checklist

## Runtime package

The production Next.js app is `urai-tier1`.

Run release checks from the monorepo root:

```bash
pnpm install
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 build
pnpm --filter urai-tier1 test:unit
```

After package changes, regenerate and commit `pnpm-lock.yaml` with `pnpm install`.

## Required environment variables

Use `urai-tier1/.env.example` as the setup reference.

Required groups:

- App URL
- Firebase public client config
- Firebase Admin service-account config for server routes
- Stripe server keys
- Stripe price IDs for Pro, Therapist, and Founder

## Firebase checklist

1. Create Firebase project.
2. Enable Authentication.
3. Enable Email/Password provider if using built-in auth.
4. Enable Firestore.
5. Create service account for server entitlement routes.
6. Deploy Firestore rules so users can read only their own entitlement and backend-only writes remain protected.

## Stripe checklist

1. Create Pro, Therapist, and Founder products/prices.
2. Copy price IDs into environment variables.
3. Add webhook endpoint: `/api/stripe/webhook-v2`.
4. Subscribe webhook to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Confirm checkout session metadata includes authenticated `userId` and selected `planId`.

## Smoke test

1. Sign up or sign in.
2. Start Pro checkout from an authenticated browser session.
3. Complete Stripe test payment.
4. Confirm Firestore document exists at `userEntitlements/{uid}`.
5. Confirm `/api/entitlement` returns 401 without a token.
6. Confirm `/api/entitlement` returns the paid plan with `Authorization: Bearer <Firebase ID token>`.
7. Confirm gated report features unlock after entitlement refresh.
8. Cancel subscription in Stripe test mode and confirm entitlement status updates.

## Launch blockers

- Verify `pnpm-lock.yaml` is updated after package changes.
- Verify all required environment variables are present in the hosting provider.
- Verify Stripe webhook signing secret matches the deployed endpoint.
- Verify the hosting provider builds `urai-tier1` or uses root scripts that delegate to `pnpm --filter urai-tier1`.
