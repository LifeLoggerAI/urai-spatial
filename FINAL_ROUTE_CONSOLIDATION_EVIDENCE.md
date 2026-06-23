# URAI Spatial Final Route Consolidation Evidence

Date: 2026-06-23
Branch: spatial-final-route-consolidation-20260623

## Scope

This pass targets the launch route spine and the visible route-truth gaps found on `urai.app`.

## Route matrix

### Public launch routes

| Route | Status | Notes |
| --- | --- | --- |
| `/` | verified live before patch | Home threshold was reachable. |
| `/home` | verified live before patch | Same Home threshold surface as root. |
| `/ground` | verified live before patch | Private real-life workforce/object layer exists. |
| `/life-map` | source checked | Current source renders `RootModeExperience initialMode="life-map"`; visible live stacking should clear after deploy refresh. |
| `/focus` | verified live before patch | Selected memory chamber exists. |
| `/replay` | verified live before patch | Living replay route exists. |
| `/mirror` | patched | Upgraded from thin stub to Mirror World component. |
| `/passport` | verified source/live | Passport remains the main permission surface. |
| `/status` | patched | Replaced simplified `Routes: 10` card with route matrix. |
| `/location-map` | verified live before patch | Symbolic place atlas exists. |
| `/privacy-controls` | patched partial | Dedicated App Router file added so the route no longer falls through to Home/Mirror. Current content is minimal because expanded write payloads were blocked by connector safety checks. |

### Demo / realm routes

`/demo`, `/demo/life-map`, `/dream`, `/legacy`, `/council`, and `/launch` are intentionally public-safe demo or realm surfaces. They were not removed.

### Gate / experimental routes

`/tier4` and `/tier5` are intentional release gate surfaces. `/spatial/shadow`, `/spatial/legacy`, and `/spatial/ar-vr` should stay out of primary launch navigation unless visually upgraded.

### API / system routes

`/api/system/health`, `/api/system/capabilities`, `/api/system/integration-contract`, `/api/system/launch-boundary`, `/api/body-biometric`, and `/api/orb-companion` are API/system routes and should not be judged as visual route stubs.

### Dynamic routes

`/focus/session/[sessionId]`, `/life-map/star/[starId]`, `/place/[placeId]`, `/place/[placeId]/replay`, `/replay/[replayId]`, and `/u/[handle]` require static/export checks in build verification.

## Files changed

- `urai-tier1/src/spatial/layout/HomeWorldProduction.tsx`
- `urai-tier1/src/spatial/layout/HomeWorldProductionHoverFix.module.css`
- `urai-tier1/src/spatial/v1/MirrorOfBecomingView.tsx`
- `urai-tier1/src/app/privacy-controls/page.tsx`
- `urai-tier1/src/app/status/page.tsx`
- `FINAL_ROUTE_CONSOLIDATION_EVIDENCE.md`

## Commands attempted

Local terminal network check:

```bash
git ls-remote https://github.com/LifeLoggerAI/urai-spatial.git HEAD
```

Result:

```text
fatal: unable to access 'https://github.com/LifeLoggerAI/urai-spatial.git/': Could not resolve host: github.com
```

The active execution container cannot resolve GitHub DNS, so local clone/build/deploy could not be run from this environment. Repository writes were performed through the GitHub connector instead.

## Patch notes

### Home hover

Added a dedicated CSS module override that keeps the ground route clickable while reducing hover from a half-screen overlay to a contained glow/label affordance. Touch devices hide hover affordances.

### Life Map

Inspected current source. `src/app/life-map/page.tsx` now routes through `RootModeExperience initialMode="life-map"`, and the visible source no longer renders the older stacked `LifeMapAaaUniverse + LaunchRoutePanel + LifeMapProductionFallback` tree directly. A live deployment refresh is required to confirm the public site has picked this source up.

### Mirror

Expanded `MirrorOfBecomingView` into a production route surface with reflection chamber, pattern constellation, before/during/after map, private-safe reflection copy, and route actions.

### Privacy Controls

Added a dedicated App Router file at `/privacy-controls`. Expanded content writes for this file were blocked by connector safety checks, so the current route is intentionally minimal rather than misleadingly falling through to Home/Mirror.

### Status

Replaced the old simplified status surface with a route matrix grouped into public launch, demo/realm, gate/experimental, API/system, and dynamic routes.

## Verification still required after deploy

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`
- `/privacy-controls`
- `/location-map`

## Remaining blockers

- Local build/test/deploy could not run because the execution container cannot resolve `github.com`.
- Expanded `/privacy-controls` content write was blocked by connector safety checks. The route exists but should be expanded in a normal terminal checkout.
- Live verification must be repeated after this branch is merged and deployed.
