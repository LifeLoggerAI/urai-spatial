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

Required groups for source and nonproduction verification:

- App URL
- Firebase public client config
- protected external-account WIF configuration for Firebase Admin server routes
- Stripe server keys
- Stripe price IDs for Pro, Therapist, and Founder

Production remains **NO-GO**. Do not treat environment completeness as deployment authorization.

## Firebase checklist

1. Confirm the intended Firebase project without creating a new long-lived key.
2. Enable Authentication only through approved provider administration.
3. Enable Email/Password provider if using the built-in auth flow.
4. Enable Firestore.
5. Configure a protected external-account WIF identity for server entitlement routes; service-account JSON and authorized-user ADC are prohibited.
6. Bind least-privilege IAM and narrow trust conditions.
7. Deploy Firestore rules so users can read only their own entitlement and backend-only writes remain protected.
8. Keep production disabled until historical-key revocation, negative-auth, audit-log review, protected read-back, exact-head staging validation, and independent approval are recorded.

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

## Nonproduction smoke test

Run only against an explicitly approved nonproduction environment and identity.

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
- Historical Google/Firebase credentials must be revoked and fail negative authentication.
- Cloud Audit Logs, WIF trust, least-privilege IAM, and protected runtime read-back must be reviewed.
- Repository/environment secret settings and exact-head staging evidence must be inspected.
- Genuine eligible non-author security/runtime approval is required.
- Verify Stripe webhook signing secret matches the approved endpoint.
- Verify the hosting provider builds `urai-tier1` or uses root scripts that delegate to `pnpm --filter urai-tier1`.
- Do not restore production deployment or recovery authority from this checklist alone.
