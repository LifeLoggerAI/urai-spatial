# URAI Spatial public surface lock - 2026-06-29

## Purpose

This lock documents the exact public-surface requirement for calling URAI Spatial live and production-ready.

A Firebase deploy completing is not enough. The live URL must render the actual URAI Spatial public surface from `main`, not an old transitional Firebase/launch shell.

## Source-of-truth route wiring

The committed root route is:

```tsx
// urai-tier1/src/app/page.tsx
import { TierOneExperience } from '@/spatial/layout/TierOneExperience'

export default function HomePage() {
  return <TierOneExperience mode="home" />
}
```

For `mode="home"`, `TierOneExperience` renders:

```tsx
return <HomeWorldProduction />
```

`HomeWorldProduction` is the production public threshold surface. It includes:

- URAI Spatial brand header.
- Sky route into Life Map.
- Ground route into real-life/private workforce layer.
- Home threshold headline: `Own your life. Step inside yourself.`
- Route rail linking Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Status.

## Live blocker

The currently observed live root has shown transitional copy:

```text
Launch build is compiling successfully. Full app deployment is being finalized.
```

That copy is not accepted as a production public surface.

## Enforced gates

These scripts now hard-fail if transitional copy, prototype language, or placeholder language appears in live responses:

- `scripts/smoke-home-xr-live-url.mjs`
- `scripts/check-home-xr-live-deploy-proof.mjs`

Forbidden live response patterns include:

- `Launch build is compiling successfully`
- `Full app deployment is being finalized`
- `Opening your spatial field`
- `Preparing the scene`
- `prototype`
- `placeholder`

## Required verification

Final public-surface lock requires a latest-main deploy followed by:

```bash
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:home-xr:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app node scripts/check-home-xr-live-deploy-proof.mjs
```

The preferred path is to run GitHub Actions workflow `Firebase XR Deploy` with:

- `deploy_target`: `hosting,functions`
- `live_url`: `https://urai-4dc1d.web.app`

Then run `URAI Spatial Post Deploy Verify` against the same URL.

## Current status

`PUBLIC SURFACE NOT YET LOCKED` until the live root renders `HomeWorldProduction` output and all live smoke/proof checks pass.
