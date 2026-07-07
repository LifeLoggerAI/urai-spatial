# URAI V1 Critical Paid Asset Lock

Status: **credit-safe intake plan**  
Owner: URAI Spatial / Asset Factory  
Scope: V1 launch-critical spatial world assets only

This document prevents wasted credits, lost files, duplicate generations, and asset drift while replacing launch-safe placeholders with bespoke final assets.

## Rule

Do **not** spend provider credits on broad V1-V5 asset generation until the V1 critical spatial pack below is generated, stored, hashed, previewed, validated, and committed.

Every paid output must land in the exact repo path listed here, then receive a SHA-256 receipt before any further generation pass.

## Canonical V1 paid asset pack

| Priority | Asset ID | Required file | Required kind | Launch purpose | Current behavior until replaced |
|---:|---|---|---|---|---|
| P0 | `home-entry-chamber-model-v1` | `urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb` | GLB | Default world / first impression | Procedural fallback |
| P0 | `portal-ring-master-glb-v1` | `urai-tier1/public/assets/urai/generated/models/portal-ring-master-v1.glb` | GLB | Reusable premium transition portal | Procedural fallback |
| P0 | `ground-world-terrain-glb-v1` | `urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb` | GLB | Walkable Ground below the default world | Procedural fallback |
| P0 | `life-map-galaxy-skybox-v1` | `urai-tier1/public/assets/urai/generated/skyboxes/life-map-galaxy-skybox-v1.hdr` | HDR skybox | Life Map as sky/galaxy, not flat overlay | Procedural starfield fallback |
| P1 | `global-cinematic-material-pack-v1` | `urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json` | JSON material map | Shared premium look across world assets | Default runtime materials |

## Credit safety protocol

1. Generate **one asset at a time**.
2. Save the raw provider result outside the browser immediately.
3. Rename it to the required canonical filename.
4. Put it in the required path under `urai-tier1/public/assets/urai/generated`.
5. Run `node scripts/receipt-v1-paid-assets.mjs`.
6. Commit the asset and receipt before generating the next asset.
7. Do not delete provider downloads until the repo receipt is green.
8. Keep a second local backup folder named `urai-paid-assets-backup/YYYY-MM-DD` until the live build is verified.

## Acceptance rules

A V1 paid asset is accepted only when:

- The file exists at the canonical path.
- The file extension matches the manifest entry.
- The receipt script writes a SHA-256 hash for it.
- `pnpm --dir urai-tier1 assets:validate` passes.
- `pnpm --dir urai-tier1 typecheck` passes.
- `pnpm --dir urai-tier1 build` or `pnpm build:static` passes.
- Screenshots/video prove the asset loads on the relevant route.

## Spending order

1. Home Entry Chamber GLB
2. Portal Ring Master GLB
3. Ground World Terrain GLB
4. Life Map Galaxy Skybox HDR
5. Global Cinematic Material Pack JSON

Only after these are locked should money move to Focus Star Flight, Replay Memory Film, Passport/Status room, audio, Rive/Lottie, social/OG, or V2-V5 expansion.

## Final lock command

```bash
node scripts/receipt-v1-paid-assets.mjs
pnpm --dir urai-tier1 assets:validate
pnpm --dir urai-tier1 typecheck
pnpm --dir urai-tier1 build
```

If any command fails, stop spending credits and fix the file/path/runtime issue first.
