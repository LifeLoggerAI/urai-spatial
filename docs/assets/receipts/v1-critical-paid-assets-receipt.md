# V1 Critical Paid Assets Receipt

Generated: 2026-07-07T23:59:00Z

## Summary

- Total assets: 5
- Present assets: 1
- Blocked assets: 4
- Locked: no

## Assets

| Asset | Present | Size | SHA-256 | Path |
|---|---:|---:|---|---|
| home-entry-chamber-model-v1 | yes | 8732 | 280d7cd5b4291d4abe0bacc274b211139cbe86adcd6c046fe343534fee12295a | `urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb` |
| portal-ring-master-glb-v1 | no | 0 | missing | `urai-tier1/public/assets/urai/generated/models/portal-ring-master-v1.glb` |
| ground-world-terrain-glb-v1 | no | 0 | missing | `urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb` |
| life-map-galaxy-skybox-v1 | no | 0 | missing | `urai-tier1/public/assets/urai/generated/skyboxes/life-map-galaxy-skybox-v1.hdr` |
| global-cinematic-material-pack-v1 | no | 0 | missing | `urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json` |

## Required validation after receipt

```bash
pnpm --dir urai-tier1 assets:validate
pnpm --dir urai-tier1 typecheck
pnpm --dir urai-tier1 build
```
