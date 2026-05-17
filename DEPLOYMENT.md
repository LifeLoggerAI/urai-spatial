# URAI Spatial Deployment

Date: 2026-05-16
Runtime app root: `urai-tier1`

## Deployment status

URAI Spatial is deployment-ready only after local/CI release gates pass and live Firebase/Stripe provider configuration is complete.

This repository is designed to boot in local fallback mode without live providers. Live deployment must not claim connected AR, WebXR, wearable, biometric, memory-grounded, Firebase, or paid-entitlement behavior until those services are configured and smoke-tested.

## Prerequisites

- Node 22+
- pnpm via Corepack
- Firebase CLI access
- Firebase project selected
- Firebase Hosting or App Hosting configured
- Optional: Playwright Chromium for E2E/visual lock tests
- Optional for monetization: Stripe account, products/prices, webhook signing secret

## Local install

```bash
corepack enable
pnpm install
```

## Local run

```bash
pnpm dev
```

Open:

```txt
http://127.0.0.1:3000
http://127.0.0.1:3000/u/adamclamp
http://127.0.0.1:3000/life-map
http://127.0.0.1:3000/spatial
```

## Required pre-deploy verification

Run the fast structural checks first:

```bash
pnpm check:spatial
pnpm typecheck
pnpm build
```

Then run smoke and release gates:

```bash
HOST=http://127.0.0.1:3000 pnpm smoke
pnpm launch:check
pnpm audit:tier-one
pnpm live:check
```

For E2E gates:

```bash
pnpm playwright:ensure
pnpm test:e2e
pnpm test:tier-lock-hardening
```

For XR-specific gates:

```bash
pnpm xr:verify
```

## Firebase Hosting deployment

Staging-style deployment:

```bash
pnpm deploy:staging
```

Production-style deployment:

```bash
pnpm deploy:prod
```

Explicit Firebase project deployment:

```bash
FIREBASE_PROJECT_ID=<project-id> pnpm live:deploy
```

Static hosting path:

```bash
FIREBASE_PROJECT_ID=<project-id> pnpm deploy:xr:firebase:static
```

## Required environment variables

See `ENVIRONMENT.md` for the canonical list. At minimum, production deployments using Firebase/Stripe entitlement features need the correct Firebase public variables, Firebase Admin credentials, and Stripe secrets.

Do not commit `.env.local` or real secrets.

## Firebase provider checklist

- [ ] Create or select Firebase project.
- [ ] Enable Firebase Hosting or App Hosting.
- [ ] Enable Firebase Auth provider(s).
- [ ] Enable Firestore.
- [ ] Deploy Firestore rules.
- [ ] Verify owner/tenant-scoped reads and writes.
- [ ] Add production Firebase public variables.
- [ ] Add Firebase Admin server credentials as secrets.
- [ ] Run `pnpm firebase:rules:check`.

## Stripe provider checklist

- [ ] Create Stripe products/prices.
- [ ] Configure checkout price IDs in hosting environment.
- [ ] Add Stripe secret key.
- [ ] Add Stripe webhook endpoint targeting `/api/stripe/webhook-v2`.
- [ ] Add Stripe webhook signing secret.
- [ ] Run a test payment.
- [ ] Confirm Firestore writes `userEntitlements/{uid}`.
- [ ] Confirm locked paid panels unlock only after entitlement refresh.

## Post-deploy smoke tests

After deployment, verify:

```txt
/ renders
/home renders
/spatial renders
/life-map renders
/demo/life-map renders
/privacy renders
/terms renders
/api/system/health returns ok JSON
/api/system/manifest returns route/API data
/api/system/capabilities returns capability data
/api/system/integration-contract returns full contract
/api/system/launch-boundary returns fallback/live-provider boundary
/api/system/urai-spatial-lock returns lock state
/api/system/urai-spatial-3d-world returns 3D world model
/api/body-biometric returns fallback/demo response without secrets
/api/orb-companion returns route-aware fallback response without secrets
```

## Rollback

If deployment fails after release gates previously passed:

1. Revert the deployment in Firebase Hosting/App Hosting.
2. Re-run `pnpm live:check` locally/CI.
3. Check provider secrets and route environment.
4. Re-run smoke routes against the deployment URL.
5. Do not enable live-provider marketing claims until the deployed smoke test passes.

## Production claim rule

Allowed before live provider verification:

- “URAI Spatial runs in privacy-safe fallback mode.”
- “URAI Spatial includes provider seams for Firebase, Stripe, LifeMap, body signals, orb navigation, and future XR.”

Not allowed before live provider verification:

- “Live AR/VR is fully active.”
- “Wearable/biometric providers are connected.”
- “Memory-grounded companion intelligence is active.”
- “Paid entitlements are production verified.”
- “Cross-device Firestore LifeMap persistence is fully verified.”
