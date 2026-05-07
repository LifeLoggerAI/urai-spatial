# URAI Spatial Runbook

This runbook is the reproducible setup and validation path for the canonical URAI Spatial launch runtime.

## Canonical runtime

URAI Spatial V1 launch routes use this path:

```txt
Next.js route -> urai-tier1/src/spatial/layout/TierOneExperience.tsx -> urai-tier1/src/scene/HomeScene.tsx
```

The older `urai-tier1/src/spatial/scene/SpatialScene.tsx` path is legacy / migration-candidate code unless it is explicitly imported by the canonical runtime.

## Required tools

- Node.js 20
- pnpm 8.15.9
- Bash-compatible shell

```bash
corepack enable
corepack prepare pnpm@8.15.9 --activate
pnpm --version
```

## Environment setup

```bash
cp .env.example .env.local
```

Fill the public Firebase values in `.env.local` or through your deployment environment. Do not commit real secrets.

Required for Firebase-backed checks:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Optional:

```bash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
NEXT_PUBLIC_URAI_MANIFEST_FIRESTORE=false
NEXT_PUBLIC_URAI_REQUIRE_TIER_GATE=false
```

## Install

```bash
pnpm install
```

## Local development

```bash
pnpm dev
```

Open:

```txt
http://127.0.0.1:3000/
http://127.0.0.1:3000/home
http://127.0.0.1:3000/ascent
http://127.0.0.1:3000/life-map
http://127.0.0.1:3000/focus
http://127.0.0.1:3000/replay
http://127.0.0.1:3000/mirror
```

## Preflight and governance

```bash
node scripts/preflight.mjs
pnpm runtime:authority
pnpm test:canon
```

## App checks

```bash
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 test
pnpm --filter urai-tier1 build
```

## Functions checks

```bash
pnpm --filter urai-functions build
pnpm --filter urai-functions test
```

## E2E checks

Install Chromium once per runner:

```bash
pnpm --filter urai-tier1 exec playwright install --with-deps chromium
```

Run the canonical spatial flow:

```bash
pnpm test:e2e
```

Run the replay Tier 5 flow:

```bash
pnpm test:replay-tier5
```

## Full local validation chain

```bash
node scripts/preflight.mjs
pnpm runtime:authority
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 test
pnpm --filter urai-tier1 build
pnpm --filter urai-functions build
pnpm --filter urai-functions test
pnpm --filter urai-tier1 exec playwright install --with-deps chromium
pnpm test:e2e
pnpm test:replay-tier5
pnpm test:canon
```

## Production lock requirements

Tier 5 is not production-locked until all automated checks pass and `verification/signoffs.md` has no `Status: PENDING` entries.

Required live checks:

- GitHub secrets exist.
- Firebase Hosting custom domain is connected.
- SSL is active.
- Firebase Auth authorized domains are configured.
- Firestore rules are deployed.
- Functions deploy with Node 20 runtime.
- Preview deploy passes.
- Production smoke passes.
- Desktop and mobile visual QA pass.
