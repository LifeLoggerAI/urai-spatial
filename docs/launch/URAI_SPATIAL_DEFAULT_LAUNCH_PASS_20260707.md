# URAI Spatial Default Launch Pass - 2026-07-07

## Verdict

Partial launch pass completed at source level. The production app entry routes now point at the canonical spatial runtime.

Live deployment is not yet green. Latest operator logs show the live verifier is still 11 of 12 because `/status` is missing the launch-truth marker strings. Treat the earlier receipt commit named `Add green static live deploy receipt` as partial, not green.

## Active production app

- Repository: `LifeLoggerAI/urai-spatial`
- Runtime root: `urai-tier1`
- Public app: `https://urai.app`
- Firebase project: `urai-4dc1d`
- Default hosting site observed in deploy logs: `urai-4dc1d`

## Routing decision

The public entry should be the spatial Home world runtime:

- `/` renders `TierOneExperience` with `mode="home"`
- `/home` renders `TierOneExperience` with `mode="home"`
- `/spatial` already renders `TierOneExperience` with `mode="home"`

This keeps flat status, proof, dashboard, and fallback routes as supporting surfaces instead of the primary launch experience.

## Source changes made

- `urai-tier1/src/app/page.tsx` now renders `TierOneExperience mode="home"`.
- `urai-tier1/src/app/home/page.tsx` now renders `TierOneExperience mode="home"`.

## Source files reviewed

- `urai-tier1/src/data/launchTruth.ts`
- `urai-tier1/src/app/status/page.tsx`
- `urai-tier1/src/spatial/layout/TierOneExperience.tsx`
- `urai-tier1/src/spatial/layout/HomeWorldProduction.tsx`
- `urai-tier1/package.json`
- `firebase.json`

## Known blockers

1. `/status` live parity remains red.
2. Static export is blocked by `/api/universe` and `/api/universe/stream` when `URAI_FIREBASE_STATIC_EXPORT=true` is used.
3. Firebase framework deploy remains the preferred deploy path while API routes and middleware are active.
4. Final green receipt must wait for `routesOk: 12` and `routesFailed: 0`.

## Next actions

1. Pull latest `main`.
2. Run `tier5:verify` from `urai-tier1`.
3. Deploy through Firebase Hosting framework mode unless API export blockers are fixed.
4. Re-run `audit:launch-truth-live`.
5. Create a corrected green receipt only after the verifier reports 12 passing routes.
