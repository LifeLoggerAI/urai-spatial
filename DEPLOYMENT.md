# URAI Spatial Deployment

URAI-Spatial V1 deploys as the `urai-tier1` Next.js app through Firebase Hosting / App Hosting.

## Prerequisites

- Node 22+
- Corepack with `pnpm@10.0.0`
- Firebase project from `.firebaserc` or `FIREBASE_PROJECT_ID`
- Server-side Firebase Admin access through a non-symlinked `GOOGLE_APPLICATION_CREDENTIALS` external-account Workload Identity Federation configuration
- Production env vars configured in Firebase/App Hosting or CI

Production release remains **NO-GO**. The checked-in release and Hosting-recovery paths are verification-only and fail closed until provider-side WIF trust, least-privilege IAM, historical-key revocation, and protected-runtime validation are independently proven.

## Required Checks

Run from the monorepo root:

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
```

Current deploy-ready baseline:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm --filter urai-tier1 test
```

`corepack pnpm test` also runs the legacy replay-tier5 browser lock. Treat a replay-tier5 failure about `seed memory bloom node is not visible` as Tier-3 until that older LifeMap replay flow is intentionally cleaned up; it does not block the active V1 home spine when build and V1 smoke pass.

Release gates:

```bash
corepack pnpm launch:check
corepack pnpm live:check
```

## Firebase Environment

Public web config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_URAI_DEMO_USER_ID=demo-user
```

Server-only configuration:

```bash
# Use only on a non-Google runtime, and only for a non-symlinked external-account WIF config.
GOOGLE_APPLICATION_CREDENTIALS=/protected/path/google-wif-external-account.json
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Do not set `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PRIVATE_KEY`, or `FIREBASE_CLIENT_EMAIL`. Do not commit `.env.local`, ADC files, service-account JSON, or other credential material. The current runtime intentionally rejects missing, service-account, and authorized-user ADC sources.

## Deploy Commands

Staging:

```bash
corepack pnpm deploy:staging
```

Production:

Production deployment is intentionally quarantined. `corepack pnpm deploy:prod` and `FIREBASE_PROJECT_ID=<project-id> corepack pnpm live:deploy` must remain fail-closed until the provider and governance gates above are proven. Do not bypass the verification-only workflow or restore a JSON-key release path.

## Post-Deploy Smoke

Verify:

```txt
/
/home
/spatial
/life-map
/u/adamclamp
/privacy
/api/system/health
/api/orb-companion
```

Expected V1 behavior:

- Home renders with sky, ground, orb, mood weather, and companion insight.
- Demo seed data appears without Firebase.
- Companion chat returns a local fallback reply.
- The V1 memory panel shows memory stars; `/life-map` remains the supported adjacent LifeMap route.
- Missing Firebase config does not blank the app.

## Deployment Status Rule

Do not call the release live from repository evidence alone. Source checks may establish deploy readiness, but production stays NO-GO until an independently approved exact head is paired with verified provider identity, revoked historical keys, negative-auth proof, protected settings, and live read-back evidence.
