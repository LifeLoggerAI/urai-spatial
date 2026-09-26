# Parallel AAA+++ Asset + Captured Reality Handoff — 2026-09-26

Status: **parallel handoff package, not pixel acceptance, not provider spend, not real captured reconstruction.**

This lane preserves active Spatial scene work and gives the pixel agent a clean integration queue. It does not modify scene-finishing files, runtime shaders, workflows, Focus hydration, Captured Reality callables or private delivery code.

## Current Authorities

| Surface | Current authority |
| --- | --- |
| `urai-spatial` default branch | `main` at `4b3c7bd982865324510eb9581d9f324bd4ad6e93` |
| Active pixel lane | PR #1325, `fix/focus-mounted-realm-proof-20260926`, head `2f7af37e0e234629d9d8261d19f778205c41f7e5` |
| Captured Reality delivery lane | PR #1327, `fix/captured-reality-authority-race-20260925`, head `e1033535d5e3e1df3e6f85e837887c9aa438cdf5` |
| Captured Replay anchor lane | PR #1341, `fix/captured-replay-anchor-20260926`, head `06a2f4cca89051b903b0b5d9ca0d2ebe9f1e1c3f` |
| Focus hydration/media lane | PR #1342, `repair/focus-hydration-proof-20260926`, head `fffa2523aadc07aa0cf59c33b0a159f876e7c92c` |
| This handoff branch | `agent/parallel-aaa-asset-splat-handoff-20260926` |

## Do-Not-Touch Ownership Map

The active Spatial pixel agent owns PR #1325 files, especially Home, Ground, Life Map, proof workflows, journey scripts and visual-contract tests. Captured Reality source/runtime ownership stays with PR #1327 and PR #1341. Adaptive quality and Focus source-media ownership stays with PR #1342.

This branch only adds:

- `docs/assets/parallel-aaa-asset-splat-handoff-20260926.json`
- `docs/assets/PARALLEL_AAA_ASSET_SPLAT_HANDOFF_20260926.md`

## AAA-001 Home Architecture

**Package:** `AAA-001-home-architecture-integration-spec-v1`  
**Scene:** Home  
**Status:** READY FOR INTEGRATION  
**Canon constraints:** sky dominant, no ceiling, first-person inhabited sanctuary, real materials, no arms/hands, no sci-fi portal hall.

**Runtime budget:** GLB, LODs required, max primary mesh target 120k triangles, KTX2 textures, mobile fallback required.

**Integration note:** consume only after the pixel agent frees Home framing. This package is a provider-ready specification, not a generated mesh.

## AAA-003 Home Atmosphere

**Package:** `AAA-003-home-atmosphere-integration-spec-v1`  
**Scene:** Home  
**Status:** READY FOR INTEGRATION

Atmosphere package should preserve the inhabited sanctuary feeling: believable sky, daylight/dusk/night variants, reduced-stimulation mode, no abstract gradient-only sky and no portal-hall language.

## AAA-004 Orb

**Package:** `AAA-004-orb-identity-integration-spec-v1`  
**Scene:** Orb / Home  
**Status:** READY FOR INTEGRATION

Orb should remain the living-memory-heart. Deliver as shader profile plus audio/haptic identity stems. Do not overwrite active Orb proof files until pixel work is frozen.

## AAA-005 Ground Terrain

**Package:** `AAA-005-ground-terrain-integration-spec-v1`  
**Scene:** Ground  
**Status:** READY FOR INTEGRATION

Terrain package should normalize units, collision, LODs and texture compression before Spatial integration. Existing canopy provenance work is owned by PR #1325 and should be preserved.

## AAA-009 Life Map

**Package:** `AAA-009-life-map-layered-galaxy-spec-v1`  
**Scene:** Life Map  
**Status:** READY FOR INTEGRATION

Layered galaxy/parallax material profile, with mobile fallback and reduced-motion variant. Do not touch active Life Map identity or proof files until #1325 integration settles.

## AAA-010 Memory Star

**Package:** `AAA-010-memory-star-photosphere-spec-v1`  
**Scene:** Memory Star / Focus dependency  
**Status:** READY FOR INTEGRATION

Canonical look: stellar photosphere/corona, not crystal, terrain, cavity or planet. This feeds Focus but does not replace PR #1342 media/hydration work.

## AAA-012 Replay Environment

**Package:** `AAA-012-replay-environment-spec-v1`  
**Scene:** Replay  
**Status:** READY FOR INTEGRATION

Replay must separate real captured input, real reconstruction, synthetic augmentation, test fixture and placeholder. Provenance labels are required in every package.

## Captured Reality / Gaussian Splat

**Package:** `captured-reality-gaussian-splat-readiness-v1`  
**Scene:** Captured Reality / Replay  
**Status:** REPAIR REQUIRED / BLOCKED

PR #1327 contains the runtime and technical binary validation lane, including `.splat` inspection and resource cleanup. PR #1341 adds anchor integrity. That is meaningful progress.

The real end-to-end chain is still blocked on source access/trained artifact availability: the smallest known private original was reported at 455,441,470 bytes, above the connected Drive transfer limit of 268,435,456 bytes. No smaller derivative or trained Gaussian splat artifact was found in the current evidence. Synthetic fixtures must not be represented as real reconstruction.

## Audio / Motion / Haptics

| Package | Status | Requirements |
| --- | --- | --- |
| `ambience-loop-map-v1` | READY FOR INTEGRATION | 48kHz, loop clean, no clipping, spatial metadata |
| `orb-sonic-identity-v1` | READY FOR INTEGRATION | calm/reflective/energized/heavy/uncertain/hopeful variants, haptic companion |
| `haptic-pattern-library-v1` | READY FOR INTEGRATION | reduced-stimulation and PTSD/TBI safe variants, hard-off honored |
| `transition-sound-and-motion-v1` | READY FOR INTEGRATION | Home → Ascent → Life Map → Focus → Replay → unwind flow |

## Handoff Queue

### Ready Now

- `AAA-001-home-architecture-integration-spec-v1`
- `AAA-003-home-atmosphere-integration-spec-v1`
- `AAA-004-orb-identity-integration-spec-v1`
- `AAA-005-ground-terrain-integration-spec-v1`
- `AAA-009-life-map-layered-galaxy-spec-v1`
- `AAA-010-memory-star-photosphere-spec-v1`
- `AAA-012-replay-environment-spec-v1`
- `ambience-loop-map-v1`
- `orb-sonic-identity-v1`
- `haptic-pattern-library-v1`
- `transition-sound-and-motion-v1`

### Waiting On Dependency

- `AAA-002-home-furnishings`: waits on accepted Home architecture dimensions/material language.
- `AAA-011-focus-environment`: waits on accepted Memory Star photosphere.
- `AAA-021-emotional-weather`: waits on accepted Home atmosphere lighting/color system.

### Blocked

- `captured-reality-gaussian-splat-readiness-v1`: needs accessible real source derivative or trained splat artifact. Current runtime proof is technical, not real reconstruction proof.

## Verification

Performed in this lane:

- Live GitHub authority readback.
- Open PR ownership and changed-file mapping.
- Isolated branch creation.
- Machine-readable manifest and human handoff creation.

Not performed in this lane:

- Paid provider generation.
- Binary mesh optimization.
- Real splat training.
- Runtime visual acceptance.
- Physical-device performance proof.
- Merge/deploy.

No provider keys were exposed and no LIVE paid activation was performed.
