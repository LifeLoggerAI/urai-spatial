# URAI Launch Asset Manifest Status

Generated: 2026-07-08T01:25:00Z  
Branch: `asset-safe-launch-pack`

## Status summary

The V1 generated candidate files are present and build-valid based on operator-provided Cloud Shell logs.

Asset validation report from operator log:

- Total manifest entries: 15
- Ready assets: 0
- Procedural placeholders: 7
- Future generation slots: 8
- Missing status entries: 0
- Paths without files yet: 7
- Invalid extensions: 0
- Blocking critical ready assets missing: 0
- Gate result: PASS

## Generated candidate assets

| Asset | Path | Status | Runtime use |
| --- | --- | --- | --- |
| Home Entry Chamber | `urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb` | present / receipt accepted | Loaded in Home asset layer |
| Portal Ring Master | `urai-tier1/public/assets/urai/generated/models/portal-ring-master-v1.glb` | present / receipt accepted | Loaded as Home, Ground, Life Map portal anchors |
| Ground World Terrain | `urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb` | present / receipt accepted | Loaded below Home as lower world candidate |
| Life Map Galaxy Skybox | `urai-tier1/public/assets/urai/generated/skyboxes/life-map-galaxy-skybox-v1.hdr` | present / receipt accepted | Present but not yet fully integrated as HDR environment in the active Life Map route |
| Focus Star Flight | `urai-tier1/public/assets/urai/generated/models/focus-star-flight-v1.glb` | present | Loaded by shared asset layer when Focus phase is active |
| Replay Memory Film | `urai-tier1/public/assets/urai/generated/models/replay-memory-film-v1.glb` | present | Loaded by shared asset layer when Replay phase is active |
| Passport/Status Room | `urai-tier1/public/assets/urai/generated/models/passport-status-room-v1.glb` | present | Hidden from default Home; intended for Passport/Status phase only |
| Global Cinematic Material Pack | `urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json` | present / receipt accepted | Present; material application pass still needed |

## Current asset integration notes

### Integrated now

- Home GLB loads through runtime without GLTF parse crash.
- Portal ring GLB is wired into Home and sky/lower-world portal placements.
- Ground terrain GLB is wired into Home as a lower-world candidate.
- Focus/Replay/Passport-Status generated GLBs are registered in the shared asset layer.

### Not fully integrated yet

- `life-map-galaxy-skybox-v1.hdr` is present but the active Life Map route still relies on its existing galaxy visuals rather than a full HDR environment pipeline.
- The global material pack is present but not broadly applied to runtime materials.
- Ground route still uses its own component rather than the generated Ground GLB as a fully navigable shared-world layer.

## Asset acceptance truth

These files are accepted as committed V1 candidate assets, not final AAA provider assets.

They may be visually replaced later without changing the manifest contract. Runtime integration must continue to preserve fallback behavior and avoid crashing if future replacement files are missing.

## Next asset-related actions

Do not generate more assets until screenshot verification proves which candidate assets actually help the launch experience.

Priority:

1. Verify Home after composition correction.
2. If Home passes, bridge Ground route into shared-world continuity.
3. Wire Life Map HDR only if it improves the existing galaxy sky without regressing the stronger current Life Map visuals.
4. Apply material pack selectively after route composition is locked.
