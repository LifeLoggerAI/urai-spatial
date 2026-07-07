# URAI Spatial Asset Forge v1

This pass adds a repo-tracked asset-generation pipeline for URAI spatial world assets.

## What this is

The goal is not flat hero art. The goal is web-ready spatial asset production:

- procedural glTF model generation
- SVG texture and particle sprite generation
- route/place manifest tracking
- safe handoff rules so no generated work is lost when billing runs out

## Generate the local asset pack

From the repository root:

```bash
node scripts/generate-spatial-asset-forge.mjs
```

This writes generated assets under:

```text
urai-tier1/public/assets/urai/spatial/
```

## Verify

```bash
node scripts/generate-and-check-spatial-assets.mjs
```

## Route coverage

- `/` and `/spatial/ar-vr`: Entry Chamber
- `/ground`: Ground Room
- `/life-map`: Life Map Sky
- `/focus`: Focus Star
- `/replay`: Replay Memory Film Portal
- `/passport`: Passport Identity Room
- `/status`: Status Control Layer
