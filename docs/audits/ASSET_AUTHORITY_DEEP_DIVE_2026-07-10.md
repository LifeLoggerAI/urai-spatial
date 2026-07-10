# URAI Asset and Model Authority Deep Dive — 2026-07-10

Tracking issue: #473

## Executive verdict

URAI has more asset work than the active runtime currently exposes, but it is split across multiple manifests, namespaces, branches, and legacy repositories.

The correct production authority is:

- repository: `LifeLoggerAI/urai-spatial`
- application: `urai-tier1`
- branch: `main`
- selected production asset root: `urai-tier1/public/assets/urai/generated`

No candidate asset should be called final or be promoted to `main` merely because it exists. Promotion requires a reproducible source, exact hash, license record, compression state, visual review, route proof, fallback proof, and exact-head CI.

## Repository roles

| Repository | Allowed role | Forbidden role |
| --- | --- | --- |
| `urai-spatial` | Canonical runtime, selected production binaries, fallback assets, runtime manifests, receipts, release proof | Depending on an untracked external repo at runtime |
| `asset-factory` | Generators, provider adapters, source metadata, production pipeline contracts | Owning the only production copy of an asset consumed by `urai.app` |
| `urai-studio` | Editor, preview, review and authoring surfaces | Becoming the public runtime source of truth |
| `UrAi` | Legacy source/reference until deliberately ported | Deploying or owning a competing production Home World |
| `UrAi-Dev` | Legacy development source/reference | Production authority |
| `UrAiProd` | Legacy manifest/source lead list | Treating manifest entries as proof that binaries exist or are licensed |

## Canonical path policy

### Selected production assets

- `urai-tier1/public/assets/urai/generated/models`
- `urai-tier1/public/assets/urai/generated/skyboxes`
- `urai-tier1/public/assets/urai/generated/textures`
- `urai-tier1/public/assets/urai/generated/audio`
- `urai-tier1/public/assets/urai/generated/loading`

### Runtime fallbacks

- `urai-tier1/public/assets/urai/fallbacks`

### Procedural proof assets

- `urai-tier1/public/assets/urai/spatial`

The procedural proof root may remain for deterministic fallback and test coverage, but it must be labeled accurately and must not silently override a reviewed generated asset.

### Contracts and evidence

- `operations/assets`
- `operations/assets/generated-receipts`
- `docs/assets/receipts`
- `docs/release`

## Current conflicts on `main`

### Conflict A — canonical generated manifest

`urai-tier1/src/spatial/assets/assetManifest.ts` defines the intended fixed generated paths for Home, portal, Ground, Life Map HDR, Focus, Replay, Passport/Status and global materials. The final entries are still marked `future`; the procedural fallback entries are marked `placeholder`.

### Conflict B — second world slot manifest

`urai-tier1/src/spatial/assets/worldAssetManifest.ts` defines another namespace under `/assets/models/**`, including Home platform, skyline, apertures, Ground layers, Life Map dome/stars, Focus diorama, Replay tunnel, Passport vault and Status tower. Every entry is currently a placeholder.

This namespace should be merged into the canonical manifest or retired. Production must not have two incompatible final path contracts.

### Conflict C — active proof-model imports

`urai-tier1/src/spatial/scene/SpatialWorldAssetLayer.tsx` directly imports `/assets/urai/spatial/**/*.gltf`. These files are deterministic procedural proof assets. The active `SpatialWorldCanvas` mounts this layer and also renders procedural terrain, avatar, stars, orb and particles.

The active layer should resolve selected generated assets through the canonical manifest and fall back explicitly to proof assets only when selection requirements are not met.

### Conflict D — route-art format naming

`launchRouteAssets.ts` uses properties named `webp` and `mobileWebp` while many launch routes point to SVG files. The fields must become format-neutral or the files must become actual optimized WebP/AVIF derivatives.

## Candidate binary recovery

Draft PR #463 contains useful generated candidate files at the intended fixed paths:

- `models/home-entry-chamber-v1.glb`
- `models/portal-ring-master-v1.glb`
- `models/ground-world-terrain-v1.glb`
- `models/focus-star-flight-v1.glb`
- `models/replay-memory-film-v1.glb`
- `models/passport-status-room-v1.glb`
- `skyboxes/life-map-galaxy-skybox-v1.hdr`
- `textures/global-cinematic-material-pack-v1.json`

The branch also contains extensive unrelated audit, quarantine, runtime and deployment changes. It is an extraction source only and must not be merged.

This PR, #469, is the preferred governing lane because it contains a focused launch-critical manifest, size/triangle/resolution budgets, compression requirements, source/license fields, deterministic forge, SHA receipts, verification and a reviewable artifact workflow.

## Legacy `UrAiProd` catalog

`UrAiProd/manifest/glb_manifest.json` describes a broad historical library covering:

- environment and modular kit pieces;
- sky domes, starfield, galaxy, nebula and cloud assets;
- orb core/rings, gates and portal geometry;
- avatar silhouette, hair, cloak and eyes;
- constellation, UI, accessibility and interaction models;
- AR reticles and anchors;
- multiple LOD levels.

A sampled listed file, `public/models/hero/orb_core_LOD0.glb`, is absent from the current default branch. Therefore the manifest is a lead list, not a binary inventory. Every listed item must be resolved to a real Git object or external source, hashed, licensed and classified before reuse.

## Required disposition values

Every discovered asset must receive exactly one disposition:

- `promote` — reviewed and selected for canonical generated paths;
- `retain-source` — useful source file or generator, not shipped directly;
- `fallback` — intentionally retained procedural/runtime fallback;
- `duplicate` — content-equivalent to another authoritative item;
- `stale-manifest` — described but binary cannot be resolved;
- `reject` — unusable, unlicensed, corrupted or visually unsuitable;
- `delete-after-proof` — removable only after a receipt proves no unique work is lost.

## Promotion gate

An asset may become `ready` only when all of these are present:

1. fixed canonical path;
2. non-empty binary or valid structured file;
3. SHA-256 receipt;
4. reproducible source or generator reference;
5. license/provenance record;
6. compression/optimization state;
7. triangle, byte or resolution budget pass;
8. visual review at the target route;
9. mobile and reduced-motion behavior where applicable;
10. fallback behavior when the selected file is unavailable;
11. typecheck, test and production build pass;
12. exact-head deployment and live smoke evidence.

## Convergence order

1. Keep #463 unmerged and preserve it only as an extraction source.
2. Run #469 forge and verification at its exact head.
3. Compare #463 candidate hashes with the fresh #469 artifact.
4. Visually review both candidate sets where hashes differ.
5. Select, compress and promote only approved files.
6. Replace direct proof-model imports with manifest-driven selection.
7. Merge or retire the `/assets/models/**` world slot namespace.
8. Fix route-art format truth.
9. Inventory all real binaries across legacy repositories and classify them.
10. Run full exact-head validation and deployment proof.

## Definition of done

- one production runtime authority;
- one generated asset namespace;
- one machine-readable manifest contract;
- zero unexplained binaries;
- zero manifest-only phantom assets;
- zero unlicensed selected assets;
- zero direct legacy-repository runtime dependencies;
- explicit, tested fallbacks for every launch-critical surface;
- continuous Home → Ground → Life Map → Focus → Replay world behavior using selected assets.