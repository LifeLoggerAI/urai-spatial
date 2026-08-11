# URAI Spatial Deploy Guide

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
- server-side Google identity: either a Google-managed runtime metadata identity or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a non-symlinked external-account Workload Identity Federation configuration
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

Production release is currently **NO-GO**. Vercel or another non-Google runtime must not be enabled until its protected external-account WIF configuration, token source, trust conditions, and least-privilege IAM bindings are installed and independently verified. The checked-in release workflow is verification-only and must not be bypassed.

## 6. Stripe production setup

- Switch to live mode.
- Create live products/prices.
- Set the price ID env values.
- Recreate webhook endpoint for the production URL at `/api/stripe/webhook-v2`.
- Verify checkout session metadata includes `planId` and authenticated `userId`.

## 7. Firebase production setup

- Confirm Auth providers.
- Enable Email/Password if using the built-in auth flow.
- Confirm Firestore is enabled.
- Confirm Firestore rules match the launch posture.
- Attach a least-privilege Google-managed runtime identity, or install a protected external-account WIF configuration for a non-Google runtime.
- Do not set `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PRIVATE_KEY`, or `FIREBASE_CLIENT_EMAIL`.
- Keep production disabled until historical keys are revoked, negative authentication is proven, Cloud Audit Logs are reviewed, and protected runtime read-back succeeds.

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
- Never create, upload, or expose Firebase service-account JSON for this runtime.
- Accept only Google-managed metadata identity or a protected external-account WIF configuration; reject authorized-user ADC and long-lived private-key credentials.
- Only backend routes write Firestore entitlements.
