# URAI Spatial Current Runtime Authority

Date: 2026-07-06

Repository: `LifeLoggerAI/urai-spatial`

Application package: `urai-tier1`

Branch authority: `main`

## Home route owner

The current public Home chain is:

```text
/ and /home
  -> FinalHomeThreshold
  -> HomeSpatialWorldFinal
```

Canonical shorthand:

```text
FinalHomeThreshold -> HomeSpatialWorldFinal
```

The earlier `TierOneExperience -> HomeScene` description is historical and does not describe the current `/` or `/home` implementation.

## Current route owners

- Home: `urai-tier1/src/app/HomeSpatialWorldFinal.tsx`
- Ground: `urai-tier1/src/app/ground/page.tsx`
- Life Map: `urai-tier1/src/components/lifemap/RealLifeMapGalaxy.tsx`
- Focus: `urai-tier1/src/app/FinalMemorySurfaces.tsx`
- Replay: `urai-tier1/src/app/replay/CinematicReplayClient.tsx`
- Mirror: `urai-tier1/src/app/mirror/page.tsx`
- Passport: `urai-tier1/src/app/passport/page.tsx`
- Status: `urai-tier1/src/app/status/page.tsx`
- XR preview: `urai-tier1/src/app/spatial/ar-vr/page.tsx`

## Release evidence source

The Status route reads:

```text
urai-tier1/src/data/currentReleaseReceipt.json
```

Empty SHA fields mean the corresponding evidence has not been established. Route reachability does not populate tested, deployed, rollback, asset, visual-QA, or device-proof fields.

## Current boundary

The route sources are implemented. Production certification remains pending in the receipt until exact-head checks and the required external evidence are recorded.
