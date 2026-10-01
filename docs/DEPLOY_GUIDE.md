# URAI Spatial Deploy Guide

Current release authority is the quarantined NO-GO canonical release workflow and
release operator. The setup sections below do not authorize a deployment, provider
activation, live billing, or bypass of independent review/protected-environment gates.

## 1. Runtime app root

The deployed Next.js app is `urai-tier1`.

Root scripts delegate to that package with `pnpm --filter urai-tier1 ...`, so production routes and environment files should be validated against `urai-tier1`, not the legacy root `src` tree.

## 2. Local setup

```bash
pnpm install
pnpm --filter urai-tier1 dev
```

Before release, run:

```bash
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 build
pnpm --filter urai-tier1 test:unit
```

## 3. Environment setup

Use `urai-tier1/.env.example` as the source of truth for required environment variables.

Required production keys include:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` pointing only to a protected, readable, regular, non-symlinked `external_account` Workload Identity Federation configuration accepted by the canonical server ADC boundary
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PRICE_PRO`
- `NEXT_PUBLIC_STRIPE_PRICE_THERAPIST`
- `NEXT_PUBLIC_STRIPE_PRICE_FOUNDER`

Optional narrator keys:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

## 4. Stripe local testing

Test Stripe locally using Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook-v2
```

The deployed app exposes both:

- `/api/stripe/webhook`
- `/api/stripe/webhook-v2`

Use `/api/stripe/webhook-v2` for production configuration because it is the documented endpoint and aliases the hardened webhook handler.

## 5. Production hosting

Recommended:

- Vercel
- Firebase Hosting

Make sure the hosting project builds `urai-tier1` or uses the root scripts that delegate to it.

## 6. Stripe release boundary

Stripe LIVE remains disabled under the current release authority. Do not switch to
live mode, create live charges, or publish live price IDs from this guide. Validate
checkout, webhook signatures, entitlement lifecycle, Portal behavior, cancellation,
renewal, idempotency, and failure handling in TEST mode only until separate owner
authorization and governed production evidence exist.

## 7. Firebase production setup

- Confirm Auth providers.
- Enable Email/Password if using the built-in auth flow.
- Confirm Firestore is enabled.
- Confirm Firestore rules match the launch posture.
- Verify the protected external-account WIF configuration referenced by `GOOGLE_APPLICATION_CREDENTIALS`; do not provision a service-account key.

## 8. Post-deploy verification

- `/spatial` renders.
- `/api/entitlement` returns 401 without token.
- Authenticated `/api/entitlement` returns the user's entitlement.
- Checkout works for signed-in users.
- Webhook fires.
- Firestore updates `userEntitlements/{uid}`.
- UI unlocks features after entitlement refresh.

## 9. Monitoring

- Enable Stripe event logs.
- Enable Firebase logs.
- Add console/error monitoring such as Sentry if available.

## 10. Rollback plan

- Keep previous deployment version.
- Disable Stripe webhook if needed.
- Revert env variables if misconfigured.
- Roll back the hosting build to the last known-good `urai-tier1` deployment.

## 11. Performance notes

- Firestore entitlement reads are lightweight.
- Entitlement calls should be cached client-side briefly.
- Avoid refetch loops.

## 12. Security reminders

- Never expose Stripe secret key.
- Do not create or expose Firebase service-account JSON, private keys, or Firebase CI tokens; use the governed external-account WIF/ADC boundary.
- Only backend routes write Firestore entitlements.
