# URAI Spatial Deploy Guide

Current release authority is the quarantined NO-GO
[canonical verification workflow](../.github/workflows/spatial-live-deploy.yml)
and [release operator](../scripts/live-release.mjs). The setup sections below do
not authorize a deployment, provider activation or live billing. Protected release
requirements and independent approval must be satisfied before any later action.

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
- `GOOGLE_APPLICATION_CREDENTIALS` pointing only to a protected, readable, regular, non-symlinked `external_account` Workload Identity Federation configuration accepted by `urai-tier1/src/lib/server/google-adc.ts`. Ambient provider-managed ADC without that file is not supported by the canonical runtime.
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
- Do not add Firebase service-account JSON, private keys, or Firebase CI tokens. Use the protected Workload Identity Federation / external-account ADC path required by the canonical runtime.

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
- Never create, restore, or deploy long-lived Firebase service-account JSON/private-key credentials for the canonical production path.
- Only backend routes write Firestore entitlements.
