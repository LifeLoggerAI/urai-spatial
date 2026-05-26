# URAI Spatial Deployment

URAI-Spatial V1 deploys as the `urai-tier1` Next.js app through Firebase Hosting / App Hosting.

## Prerequisites

- Node 22+
- Corepack with `pnpm@10.0.0`
- Firebase CLI authenticated to the target project
- Firebase project from `.firebaserc` or `FIREBASE_PROJECT_ID`
- Production env vars configured in Firebase/App Hosting or CI

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

Server-only secrets:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Do not commit `.env.local` or service account JSON.

## Deploy Commands

Staging:

```bash
corepack pnpm deploy:staging
```

Production:

```bash
corepack pnpm deploy:prod
```

Explicit Firebase project:

```bash
FIREBASE_PROJECT_ID=<project-id> corepack pnpm live:deploy
```

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

Only call the release live when a deploy command returns a live URL and the smoke routes pass. Otherwise report the build as deploy-ready and list the missing credentials or verification step.
