# URAI AAA launch candidate receipt — 2026-06-30

## Repository

- Repo: `LifeLoggerAI/urai-spatial`
- Branch: `main`
- Source commit before this pass observed from GitHub code search URLs: `4742ef43fb439164a7b7ea5b977b65b281642758`
- Patch commits from this pass:
  - `041140bc3fb3700a2db175718adc129203f35a46` — imported final launch candidate stylesheet in `urai-tier1/src/app/layout.tsx`
  - `425f316ae84db8327a2555b0e6dc262824dd402d` — added `urai-tier1/src/app/launch-candidate-final-pass.css`
  - `7c735f757ee35c0f91ac1a8cc907cb1d271bf566` — added `urai-tier1/src/app/spatial/ar-vr/XrCapabilitySignal.tsx`
  - `6cb5865baa86c357e52c1e883b3d7c385762b613` — wired XR capability signal into `/spatial/ar-vr`

## Build and package system

- Package manager: `pnpm@10.0.0`
- Node engine: `>=22`
- Workspace app: `urai-tier1`
- Main build command: `pnpm build`
- Static Firebase build command: `pnpm build:static`
- Live deploy command: `pnpm live:deploy:static`
- Firebase static deploy command: `firebase deploy --config firebase.static.json --only hosting --project ${FIREBASE_PROJECT_ID:-urai-4dc1d}`

## Source route audit

| Route | Source status | Notes |
| --- | --- | --- |
| `/` | Present | Root redirects/renders home in current live behavior. |
| `/home` | Present | `HomeSpatialWorldFinal` has sky, ground, orb, body/avatar, and portals. |
| `/ground` | Present | `GroundAaaWorld` includes private operating world, zones, agents, objects, and route rail. |
| `/life-map` | Present | Uses `SpatialLifeMapCanonical` and dynamic R3F `LifeMapScene`. |
| `/focus` | Present | Uses `FinalFocusChamber`. |
| `/replay` | Present | Uses `FinalReplayFilm`. |
| `/mirror` | Present | Reflection realm route with background asset and route rail. |
| `/passport` | Present | Uses `FinalPassportVault`. |
| `/status` | Present | Live control room route matrix. |
| `/privacy-controls` | Present | Privacy/consent controls surface. |
| `/location-map` | Present | Uses `LocationMapScene` with fallback memory places. |
| `/spatial/ar-vr` | Present | Quest/XR portal; this pass added browser WebXR capability detection. |

## Changes made in this pass

1. Added a final launch-candidate stylesheet for mobile hardening, route rail containment, tap targets, focus states, reduced-motion support, and cinematic depth across Home, Ground, Life Map, Focus, Replay, Mirror, Passport, and XR.
2. Wired the stylesheet into the root layout after the existing visual passes so it acts as a final override layer.
3. Added `XrCapabilitySignal`, a client-side WebXR detector using `navigator.xr.isSessionSupported` with safe fallback states.
4. Updated `/spatial/ar-vr` copy and rendering to show honest capability status while keeping Quest physical-device proof marked manual.

## Current live verification from browser fetch before redeploy

Expected live domain: `https://urai.app`

| Route | Browser fetch result before redeploy |
| --- | --- |
| `/` | Redirects/renders `/home`; reachable, but still shows older public-demo copy. |
| `/home` | Reachable, but live content is older than the repo final Home component. |
| `/ground` | Reachable, but live content is older than repo `GroundAaaWorld`. |
| `/life-map` | Reachable, but live says `12 stars awake`; repo has true-3D route source. |
| `/focus` | Reachable, but live content is older public-demo focus copy. |
| `/replay` | Reachable, but live content is older replay preview copy. |
| `/mirror` | Reachable. |
| `/passport` | Reachable. |
| `/status` | Reachable. |
| `/privacy-controls` | Reachable. |
| `/location-map` | Browser fetch returned internal error. Needs redeploy/live smoke. |
| `/spatial/ar-vr` | Browser fetch returned internal error. Needs redeploy/live smoke after XR patch. |

## Asset audit summary

Source asset manifest: `urai-tier1/src/spatial/assets/uraiAssets.ts`

| Category | Status | Paths |
| --- | --- | --- |
| Home world | final / fallback-safe | `/assets/urai/home/home-threshold-main.webp`, `/assets/urai/home/home-threshold-mobile.webp`, fallback SVGs |
| Ground world | placeholder-final / fallback-safe | `/assets/urai/ground/*`, fallback SVGs |
| Life Map | placeholder-final / fallback-safe | `/assets/urai/life-map/*`, fallback SVGs; R3F memory star textures are generated in code |
| Focus | placeholder-final / fallback-safe | `/assets/urai/focus/*`, `/assets/urai/memories/focus-first-light.png` |
| Replay | placeholder-final / fallback-safe | `/assets/urai/replay/*` |
| Mirror | placeholder-final / fallback-safe | `/assets/urai/mirror/*` |
| Passport | placeholder-final / fallback-safe | `/assets/urai/passport/*` |
| Privacy controls | placeholder-final / fallback-safe | `/assets/urai/privacy-controls/*` |
| Location Map | placeholder-final / fallback-safe | `/assets/urai/location-map/*` |
| Status | placeholder-final / fallback-safe | `/assets/urai/status/*` |
| Avatars | placeholder-final / fallback-safe | `/assets/urai/avatars/*` |
| Orb/UI | placeholder-final / fallback-safe | `/assets/urai/ui/*` |

Existing visual asset audit page: `urai-tier1/public/asset-audit/index.html` reports `GREEN=26`, `YELLOW=76`, `RED=0`, `TOTAL=102`. Yellow means usable but soft/flat or low-contrast; not missing.

## Mobile proof summary

Source-level mobile hardening added in `launch-candidate-final-pass.css`:

- fixed horizontal overflow containment
- rail scroll containment
- minimum 44px tap targets
- smaller mobile Home/Life Map/memory-surface headings
- safe-area bottom spacing
- focus-visible outlines
- reduced-motion fallback
- Life Map canvas touch behavior

Physical-device/browser screenshot proof still needs to be captured after redeploy.

## Quest/WebXR status

- Source route `/spatial/ar-vr` now includes browser capability detection.
- Quest 2 physical-device verification is not complete from this environment.
- Do not mark Quest verified until Quest Browser loads `/spatial/life-map` and `/spatial/ar-vr` and interaction is manually confirmed.

## Required deploy commands

Run from the repo root after pulling latest `main`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build:static
firebase deploy --config firebase.static.json --only hosting --project ${FIREBASE_PROJECT_ID:-urai-4dc1d}
```

Then live-smoke:

```bash
BASE=https://urai.app
for route in / /home /ground /life-map /focus /replay /mirror /passport /status /privacy-controls /location-map /spatial/ar-vr; do
  curl -s -o /dev/null -w "%{http_code} $BASE$route\n" -L "$BASE$route"
done
```

## Blockers

- This execution environment cannot clone from GitHub with terminal DNS access.
- This execution environment does not expose Firebase credentials/deploy execution.
- Live `urai.app` is currently stale relative to source and must be redeployed.
- Quest hardware proof is blocked until tested in actual Quest Browser.
