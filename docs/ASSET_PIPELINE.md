# URAI Asset Pipeline

The asset pipeline keeps generated world assets safe, trackable, and replaceable.

## Folder contract

- `urai-tier1/public/assets/urai/generated/models/`
- `urai-tier1/public/assets/urai/generated/textures/`
- `urai-tier1/public/assets/urai/generated/skyboxes/`
- `urai-tier1/public/assets/urai/generated/portals/`
- `urai-tier1/public/assets/urai/generated/worlds/`
- `urai-tier1/public/assets/urai/fallbacks/models/`
- `urai-tier1/public/assets/urai/fallbacks/portals/`
- `urai-tier1/public/assets/urai/fallbacks/worlds/`
- `urai-tier1/public/assets/urai/fallbacks/skyboxes/`

## Flow

1. Add or update an entry in `assetManifest.ts`.
2. Generate or import the asset into the matching public path.
3. Mark the manifest entry `ready` after the file exists.
4. Keep a fallback asset linked by `fallbackAssetId`.
5. Run `pnpm --dir urai-tier1 assets:validate`.
6. Wire the manifest asset into the spatial route.

## Import naming

Use stable lower-case file names:

- `home-entry-chamber-v1.glb`
- `portal-ring-master-v1.glb`
- `ground-world-terrain-v1.glb`
- `life-map-galaxy-skybox-v1.hdr`
- `focus-star-flight-v1.glb`
- `replay-memory-film-v1.glb`
- `passport-status-room-v1.glb`

## Runtime behavior

If a final model is not ready, the app should render an intentional procedural fallback instead of blank space or a broken world.
