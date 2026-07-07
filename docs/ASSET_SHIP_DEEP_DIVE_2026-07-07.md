# URAI Asset Ship Deep Dive — 2026-07-07

## Verdict

URAI has the asset-generation and spatial wiring spine needed for a scoped V1 launch candidate, but it is not yet safe to call the full autonomous ecosystem broad-production ready.

The launchable path is:

1. Keep the public claim scoped to V1 spatial/demo/pilot until fresh receipts pass.
2. Use `placeholder-final` route art and procedural runtime fallbacks where the manifest allows it.
3. Generate/replace bespoke final 3D/visual/audio assets into the same canonical paths.
4. Run asset validation, typecheck, build, XR contract, live release gate, deploy, and smoke.
5. Record evidence before any stronger public claim.

## Repositories inspected

- `LifeLoggerAI/urai-spatial`
- `LifeLoggerAI/asset-factory`
- `LifeLoggerAI/UrAi`
- `LifeLoggerAI/urai-studio`
- `LifeLoggerAI/urai-jobs`
- `LifeLoggerAI/urai-admin`
- related ecosystem status evidence under `UrAi/launch-proof`

## Source-of-truth files found

### Spatial asset truth

- `docs/ASSET_MANIFEST.md`
- `docs/AAA_ASSET_MANIFEST_V1_TO_V5.md`
- `urai-tier1/src/spatial/assets/assetManifest.ts`
- `urai-tier1/src/spatial/assets/launchRouteAssets.ts`
- `urai-tier1/scripts/validate-assets.mjs`
- `LIVE_RELEASE.md`
- `release/urai-spatial-live-manifest.json`

### Asset Factory truth

- `LifeLoggerAI/asset-factory/README.md`
- `LifeLoggerAI/asset-factory/LAUNCH_READINESS.md`
- `LifeLoggerAI/asset-factory/docs/MULTIMODAL_ASSET_WIRING.md`

### Ecosystem truth

- `LifeLoggerAI/UrAi/launch-proof/urai-ecosystem-production-lock/2026-06-30T000000-0500/README.md`

## Required asset inventory

### V1 — launchable spatial Genesis

Generate or replace these first, in this order:

1. Home Entry Chamber GLB: `/assets/urai/generated/models/home-entry-chamber-v1.glb`
2. Portal Ring Master GLB: `/assets/urai/generated/models/portal-ring-master-v1.glb`
3. Ground World Terrain GLB: `/assets/urai/generated/models/ground-world-terrain-v1.glb`
4. Life Map Galaxy Skybox: `/assets/urai/generated/skyboxes/life-map-galaxy-skybox-v1.hdr`
5. Focus Star Flight GLB: `/assets/urai/generated/models/focus-star-flight-v1.glb`
6. Replay Memory Film GLB: `/assets/urai/generated/models/replay-memory-film-v1.glb`
7. Passport/Status Spatial Room GLB: `/assets/urai/generated/models/passport-status-room-v1.glb`
8. Global Cinematic Material Pack: `/assets/urai/generated/textures/global-cinematic-material-pack-v1.json`
9. Route art replacement pack under `/assets/urai/bespoke/**` for home, ground, life-map, focus, replay, mirror, passport, XR, mobile variants.
10. Public launch kit: Open Graph, social preview, app preview phone, status/trust visuals.

### V2 — embodied Life OS

- Workforce avatar expansion.
- Object state pack for hover, active, inspect, locked, protected states.
- Memory-star variants for relationship, family, legacy, recovery, work, place, body constellations.
- Onboarding visuals.

### V3 — XR proof

- Quest entry visuals.
- WebXR fallback.
- Controller reticle.
- Hand ray.
- Comfort mode.
- AR tabletop constellation.
- Optimized GLB/GLTF model replacements for placeholder XR models.
- Physical Quest Browser evidence.

### V4 — operations/platform

- Studio preview.
- Admin control room.
- Analytics insight map.
- Jobs queue.
- Content/story template.
- Privacy operations.
- Investor/system map.

### V5 — trust/accessibility/global scale

- Trust/consent architecture.
- Reduced motion.
- High contrast.
- Captions layer.
- Launch proof matrix.
- Security boundary.
- Export/delete flow.
- Haptics/audio placeholder visuals.

## Current wiring status

### Already wired

- Route art is wired through `launchRouteAssets.ts`.
- Asset manifest source of truth exists in `assetManifest.ts`.
- Manifest statuses support `ready`, `placeholder`, `future`, and `missing`.
- Critical future assets have procedural fallbacks.
- Asset validator writes `docs/ASSET_VERIFICATION_REPORT.md` and fails only for invalid extensions or critical `ready` files that are absent.
- Spatial package has scripts for asset validation, receipts, AAA world verification, XR verification, tier verification, final visual audit, route audit, console audit, env audit, typecheck, tests, build, and live release.
- Manifest renderer can render image, video, and GLTF/GLB assets with safe fallback behavior.

### Not proven complete yet

- `docs/ASSET_VERIFICATION_REPORT.md` was not found in the repo at the time of this audit.
- The manifest still marks final GLB/HDR/material assets as `future` rather than `ready`.
- Asset Factory production lock is pending live staging and production evidence with `ASSET_FACTORY_FORCE_LOCAL=false`.
- Provider-backed generation is not proven live for selected launch asset types.
- Quest/WebXR claims remain blocked until provider/device validation evidence exists.
- Full ecosystem broad production remains blocked by missing live receipts, privacy/security proof, and cross-repo integration validation.

## Execution order

From `LifeLoggerAI/urai-spatial`:

```bash
set -e
corepack enable || true
pnpm install --frozen-lockfile
pnpm --dir urai-tier1 assets:validate
pnpm --dir urai-tier1 receipt:assets
pnpm --dir urai-tier1 typecheck
pnpm --dir urai-tier1 verify:aaa-world
pnpm --dir urai-tier1 xr:verify
pnpm live:check
```

If green, deploy:

```bash
FIREBASE_PROJECT_ID=urai-4dc1d pnpm live:deploy
HOST=https://<live-host> pnpm smoke
```

From `LifeLoggerAI/asset-factory`:

```bash
set -e
unset NPM_CONFIG_PREFIX
nvm install 22
nvm use 22
node scripts/setup-local.mjs
npm run doctor
npm run test:launch-readiness
npm run test:completion-lock
npm --prefix assetfactory-studio run check
npm --prefix assetfactory-studio run e2e
```

Then use the documented GitHub Actions deploy/smoke sequence for staging and production with `ASSET_FACTORY_FORCE_LOCAL=false`.

## Go/no-go

GO: scoped V1 spatial/demo/pilot launch candidate after current asset validation, build, release, deploy, and smoke receipts pass.

NO-GO: broad autonomous ecosystem production claim until every P0 proof gate is closed: live receipts, provider generation, privacy/security, admin protection, cross-repo integration, observability, rollback, and final signoff.
