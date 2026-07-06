# URAI Spatial Current Runtime Authority

Date: 2026-07-06

- Repository: `LifeLoggerAI/urai-spatial`
- Product root: `urai-tier1`
- Branch authority: `main`
- Public domain: `https://urai.app`
- Intended Firebase project: `urai-4dc1d`

## Home route owner

```text
/ and /home
  -> FinalHomeThreshold
  -> HomeSpatialWorldFinal
```

Older `TierOneExperience -> HomeScene` descriptions are historical and do not describe the current Home implementation.

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

## Release evidence boundary

Status reads `urai-tier1/src/data/currentReleaseReceipt.json`. Empty SHA or evidence fields mean the corresponding fact has not been established. Route reachability does not certify tested SHA, deployed SHA, rollback SHA, provider assets, visual QA, or physical-device proof.
