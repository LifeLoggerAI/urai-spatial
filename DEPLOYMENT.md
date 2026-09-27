# URAI Spatial Deployment

This V1 guide is historical context, not current release authorization. The
canonical [release verification workflow](.github/workflows/spatial-live-deploy.yml)
and [release operator](scripts/live-release.mjs) currently quarantine production
mutation as NO-GO. Existing independent review, WIF identity, protected-environment,
artifact, rollback and live-verification requirements remain mandatory. Commands
below do not authorize bypassing that quarantine or enabling providers or billing.

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

`corepack pnpm test` also runs the replay-tier5 browser lock. A failing required
check remains blocking; build or smoke success does not waive it. Any claimed
inapplicability must be established by the current governing policy and evidence.

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

Server-only configuration and secrets:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/protected/path/external-account-wif.json
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

The ADC path must reference a protected, readable, regular, non-symlinked
`external_account` Workload Identity Federation configuration accepted by
`urai-tier1/src/lib/server/google-adc.ts`. Ambient provider-managed ADC without
that file is not supported by this runtime. Do not create, encode, configure or
commit Firebase service-account JSON, private keys, Firebase CI tokens or
`.env.local`. Do not place credential material in evidence or logs.

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

Only call a revision live after its authorized protected deployment and subsequent
exact-revision live verification are evidenced. A successful build does not establish
merge or protected-deploy eligibility. Report each unsatisfied requirement explicitly.
