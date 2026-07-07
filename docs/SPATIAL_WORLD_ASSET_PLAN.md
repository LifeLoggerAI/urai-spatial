# URAI Spatial World Asset Plan

Status: manifest-first asset pipeline bootstrapped.

## Order

1. Manifest and validation gate.
2. GLB model import slots.
3. Texture and material import slots.
4. Runtime integration into spatial routes.
5. Visual verification and launch readiness report.

## Critical v1 asset slots

- Home entry chamber GLB: `/assets/urai/generated/models/home-entry-chamber-v1.glb`
- Portal ring master GLB: `/assets/urai/generated/models/portal-ring-master-v1.glb`
- Ground world terrain GLB: `/assets/urai/generated/models/ground-world-terrain-v1.glb`
- Life Map galaxy skybox: `/assets/urai/generated/skyboxes/life-map-galaxy-skybox-v1.hdr`

## High-priority v1 asset slots

- Focus star flight GLB: `/assets/urai/generated/models/focus-star-flight-v1.glb`
- Replay memory film GLB: `/assets/urai/generated/models/replay-memory-film-v1.glb`
- Global cinematic material pack: `/assets/urai/generated/textures/global-cinematic-material-pack-v1.json`

## Gate

Every generated asset must be listed in `urai-tier1/src/spatial/assets/assetManifest.ts`, stored under `public/assets/urai/generated`, and checked with `pnpm --dir urai-tier1 assets:validate`.
