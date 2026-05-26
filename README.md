# URAI Spatial

URAI-Spatial V1 is the deployable demo spine for URAI: a calm magical home screen that renders without production data, shows demo mood weather, presents a companion reflection, and lets the user open companion chat or the symbolic memory map.

The V1 scope is intentionally narrow. It proves the loop: open URAI, see the living home, read the current mood/reflection, open chat, open memory stars, and deploy.

## App Root

- Monorepo root: `.`
- App root: `urai-tier1`
- Package manager: `pnpm@10.0.0`
- Framework: Next.js App Router, React, TypeScript
- Runtime target: Node 22+
- Deploy target: Firebase Hosting / App Hosting, configured by `firebase.json`

## Tier Readiness

- Tier-1 Launch Spine: `/`, `/home`, and `/spatial` render `UraiV1Experience` with demo-first mood weather, orb companion, chat, memory panel, loading state, empty state, and Firestore fallback.
- Tier-2 Supported Adjacent Layer: `/life-map`, `/replay`, `/focus`, direct memory/replay routes, and shared spatial contracts remain buildable and isolated from the active V1 home.
- Tier-3 Legacy / Experimental / Roadmap: XR, replay-tier5 browser locks, advanced LifeMap scenes, marketplace/monetization, and deeper provider systems are not required for the V1 spine and must not block Tier-1.

## V1 Demo Loop

1. Open `/`, `/home`, or `/spatial`.
2. The URAI home renders with sky, ground, orb, mood weather, and seeded demo state.
3. The companion insight appears.
4. Open companion chat from the orb or CTA.
5. Open `/life-map` or the memory map panel to see memory stars.
6. Build and deploy through the documented pnpm/Firebase path.

The app works in demo mode when Firebase is not configured. If valid Firebase public env vars and readable user-scoped documents exist, V1 can read:

- `users/{userId}/moodStates/current`
- `users/{userId}/companionInsights/latest`
- `users/{userId}/memoryStars/{starId}`

## Local Setup

Run from the monorepo root:

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
corepack pnpm install
```

Run locally:

```bash
corepack pnpm dev
```

Open:

```txt
http://127.0.0.1:3000
http://127.0.0.1:3000/home
http://127.0.0.1:3000/spatial
http://127.0.0.1:3000/life-map
http://127.0.0.1:3000/u/adamclamp
```

## Verification

Use the repo scripts:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
```

Known test boundary: `corepack pnpm test` currently reaches the legacy replay-tier5 browser lock and can fail on the Tier-3 LifeMap node visibility check (`seed memory bloom node is not visible`). `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm build`, and `corepack pnpm --filter urai-tier1 test` are the current deploy-readiness checks for the active Tier-1/Tier-2 surface.

For the full release gate:

```bash
corepack pnpm launch:check
corepack pnpm live:check
```

## Environment Variables

Copy `.env.example` to `.env.local` for local work. Do not commit `.env.local`.

Public Firebase config, required only for live Firebase-backed reads:

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

Server-only secrets, if using admin routes or providers:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Never expose server-only secrets through `NEXT_PUBLIC_` variables.

## Deployment

Firebase config is present in `firebase.json` and `.firebaserc`.

Deploy after verification passes:

```bash
corepack pnpm deploy:staging
```

or:

```bash
corepack pnpm deploy:prod
```

Explicit project deploy:

```bash
FIREBASE_PROJECT_ID=<project-id> corepack pnpm live:deploy
```

If credentials are not available, run `corepack pnpm build` and deploy from a machine or CI environment with Firebase CLI access.

## Privacy Boundary

URAI-Spatial V1 does not require live passive ingestion, raw audio, camera capture, private media, ads, or third-party tracking for the demo. The home experience falls back to typed local demo data when Firebase is absent, empty, or unavailable.
