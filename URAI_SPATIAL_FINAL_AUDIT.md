# URAI Spatial Final Audit

This branch is `urai-genesis-final-integration` for `LifeLoggerAI/urai-spatial`.

Confirmed from repository evidence:

- The active Firebase Studio workspace was `LifeLoggerAI/urai-spatial`, not `LifeLoggerAI/UrAi`.
- The working visual runtime is the spatial Next app under `urai-tier1`.
- The visible home scene includes the orb, sky/star field, horizon/ground, bottom navigation, Enter the Sky, and Enable Audio controls.
- `src/spatial/scene/SpatialScene.tsx` imports and renders `@/components/spatial/LifeMapScene` when the scene is not in HOME.
- Before this branch, `urai-tier1/src/app/life-map/page.tsx` imported `TimelineView` and rendered the simple timeline list.
- This branch changes `/life-map` to render `@/components/spatial/LifeMapScene`.

Not production-locked yet:

- Local typecheck, build, unit tests, route smoke, and Firebase checks still need to be run in Firebase Studio or CI.
- The workspace storage situation in `/home` is constrained, so use `/tmp` with npm and pnpm caches redirected there.
- Deployment has not been run and should not run until checks pass.

Manual verification path:

1. Open the spatial home on port 3001.
2. Confirm the orb, sky/star field, horizon, and bottom nav are visible.
3. Click Enter the Sky and LifeMap.
4. Visit `/life-map` directly.
5. Confirm the spatial LifeMap appears instead of the old simple timeline list.
