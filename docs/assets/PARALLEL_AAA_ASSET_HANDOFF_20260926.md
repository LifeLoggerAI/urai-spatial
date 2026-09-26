# Parallel AAA Asset Handoff - 2026-09-26

Status: execution handoff package; second pass produced real deterministic candidate artifacts
Branch: `agent/parallel-aaa-asset-handoff-20260926`
Base authority: `main` at `4b3c7bd982865324510eb9581d9f324bd4ad6e93`
Machine-readable manifest: `docs/assets/parallel-aaa-asset-handoff-20260926.json`

## Concurrency Boundary

The active Spatial pixel lane is preserved.

| Lane | PR | Branch | Head | This branch action |
|---|---:|---|---|---|
| Pixel / scene finishing | #1325 | `fix/focus-mounted-realm-proof-20260926` | `dac51067676d6eb717a16ac14a8d782f3f9a049a` | Do not touch scene or route proof files |
| Captured Reality race repair | #1327 | `fix/captured-reality-authority-race-20260925` | `e1033535d5e3e1df3e6f85e837887c9aa438cdf5` | Treat as dependency |
| Replay place anchor contract | #1341 | `fix/replay-place-anchor-contract-20260926` | `06a2f4cca89051b903b0b5d9ca0d2ebe9f1e1c3f` | Treat as dependency |

This branch owns asset-system receipts, deterministic generated assets, spatial forge assets, and docs/handoff files. It does not modify runtime scene code, visual pixel files, active repair workflows, or PR #1325 pixel-owned files.

## Current Authority Read

Read and reconciled:

- `docs/assets/PARALLEL_ASSET_PRODUCTION_PLAN.md`
- `docs/ASSET_PIPELINE.md`
- `docs/ASSET_MANIFEST.md`
- `docs/PHASE_5_STATUS.md`
- `urai-tier1/src/lib/urai-field-reconstruction.ts`
- Current open Spatial PR list and current workflow activity

Important truth boundary: `docs/PHASE_5_STATUS.md` says Phase 5 currently provides renderer-safe field primitives and future-splat-shaped data. It does not claim a production native 3D Gaussian splat renderer, live private reconstruction, or trained captured reality output.

## Second-Pass Execution Result

The earlier `READY FOR INTEGRATION` wording meant contract/package slots, not final consumable Spatial assets. This pass corrects that truth boundary.

Real artifacts now exist for the deterministic forge path and the spatial procedural forge path. They are validated candidates, not final AAA+++ provider art and not final Spatial integration until the remaining package gates are cleared: human visual approval, production compression where required, and any package-specific bounds/material warnings.

Detailed receipt: `docs/assets/parallel-aaa-asset-second-pass-20260926.json`

| Package | Scene | Final artifact path | State | Notes |
|---|---|---|---|---|
| `urai-home-architecture-launch-contract-v1` | Home | `urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb` | REAL ARTIFACT READY CANDIDATE | `sha256:0a3c3c2da53c5fe25958e57954c8337d7a27d9c4f94ae0967de21ae84e3e8883`; bounds/compression/visual-review gates remain |
| `urai-orb-avatar-sonic-identity-v1` | Global/Home | `urai-tier1/public/assets/urai/generated/models/urai-orb-avatar-v1.glb` | REAL ARTIFACT READY CANDIDATE | `sha256:83b252f0de613a60fffb15e07cdf4f02ca81b59aac5d5bfccce7ee716287f77d`; sonic final mix still pending |
| `urai-ground-terrain-canopy-ridge-v1` | Ground | `urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb` | REAL ARTIFACT READY CANDIDATE | `sha256:8068d71509d55035efeb869d827328aa5422a99f6a1f46c80db1424c8f32e1e8`; collision/LOD/material acceptance remain |
| `urai-life-map-galaxy-memory-star-v1` | Life Map | `urai-tier1/public/assets/urai/generated/models/life-map-memory-star-v1.glb` | REAL ARTIFACT READY CANDIDATE | `sha256:6fa964e1c51b66f83ccafa7c0c774185bee528dfbb673d8b906bc2dc181f9bcf`; HDR skybox still not produced |
| `urai-passport-physical-object-v1` | Passport | `urai-tier1/public/assets/urai/generated/models/passport-status-room-v1.glb` | REAL ARTIFACT READY CANDIDATE | `sha256:47189faa314c4aa0bea590c70bd18c5e71feed3db41b62818e5d66e08a96e8c3`; physical-object visual review remains |
| `urai-sensory-audio-haptic-pack-v1` | Global | `urai-tier1/public/assets/urai/generated/audio/urai-ambient-bed-v1.wav`, `urai-tier1/public/assets/urai/generated/haptics/semantic-haptic-patterns-v1.json` | GENERATED VALIDATED CANDIDATE | audio `sha256:148c93d429e1d2bd664756152377227d3d6e7e4b79878b26d317e7c7dfab318d`; haptics `sha256:27a61beeb0cd84c6a5daef98b0eb38aae9d221c2179e53e03e48a85e2e2da583`; production compressed audio/final mix remain |

## Waiting On Dependency

| Package | Dependency | Reason |
|---|---|---|
| `urai-replay-memory-environment-v1` | #1327 and #1341 | Replay needs stable captured-reality authority and explicit place anchors before final use |
| `urai-captured-reality-splat-pipeline-v1` | Real capture/provider output/native renderer | No verified real captured input or trained reconstruction is present in current accessible authority |

## Captured Reality / Gaussian Splat Status

Current status: `REPAIR REQUIRED`.

Truth labels required for every future output:

- `REAL CAPTURED INPUT`
- `REAL RECONSTRUCTION`
- `SYNTHETIC AUGMENTATION`
- `TEST FIXTURE`
- `PLACEHOLDER`

No synthetic demo should be called captured reality. No future-splat-shaped emotional field primitive should be called a native trained Gaussian splat.

Minimum evidence required before promotion:

| Evidence | Required value |
|---|---|
| Input provenance | exact source/capture set, dates and license/consent |
| Reconstruction log | tool/provider, version, settings and run id where available |
| Visual inspection | holes, floaters, noisy splats, edges, moving-object artifacts, reflective/transparent failure, sky/exposure issues |
| Scale/orientation | meter scale, forward/up axis and origin contract |
| Performance | raw size, optimized size, splat count, CPU/GPU memory, load time, first meaningful render, FPS, mobile/desktop behavior |
| Runtime variants | high, medium and fallback when needed |
| Handoff | one authoritative final artifact path plus hashes |

## Provider Execution Policy

Use existing abstractions and secrets only. Do not print keys, commit keys, or activate unnecessary LIVE paid functionality.

Suggested routing:

| Asset family | Preferred path | Fallback path |
|---|---|---|
| GLB worlds/objects | Meshy or Tripo output normalized by Asset Forge | deterministic GLB forge candidate |
| HDR/sky/texture | OpenAI/fal/Stability image generation, then HDR/texture validation | procedural fallback |
| Motion | Move AI only through existing secret binding | static reduced-motion clips |
| Sonic/audio | ElevenLabs/OpenAI/Runway through existing abstraction | locally authored quiet fallback loop |
| Captured reality | Real photo/video capture, reconstruction/training, optimization | labeled test fixture only |

## Validation Queue

Executed in clean checkout:

```bash
node scripts/forge-launch-critical-assets.mjs
node scripts/normalize-launch-critical-assets.mjs
node scripts/verify-launch-critical-assets.mjs
node scripts/audit-launch-critical-artifact.mjs
node scripts/generate-spatial-asset-forge.mjs
node scripts/check-spatial-asset-forge.mjs
```

Results: normalization passed for 26 assets, launch-critical verification passed for 26 assets, audit passed with candidate warnings only, and spatial forge check passed for 20 generated procedural assets.

## Do-Not-Touch Map

Do not modify these from this lane while #1325 is active:

- current Focus/Home/Ground/Replay scene components
- route visual proof scripts owned by #1325
- canvas budget and mounted realm proof files touched by #1325
- active exact-head workflow repairs owned by the pixel agent

If integration code becomes necessary, create a successor branch from the current pixel lane after it stabilizes and keep the commit narrow.

## Remaining Blockers

| Blocker | Smallest next action |
|---|---|
| No verified real captured input in accessible GitHub authority | Provide or locate real capture set and attach provenance |
| No native production Gaussian splat renderer claim on `main` | Land renderer/loader separately with proof, or keep status as future/test fixture |
| No exposed provider GLB/audio generation tool in this turn | Run provider generation through existing bound system when accessible; store output with provenance |
| Local shell unavailable | Repair workspace mount or use a clean checkout to run validation commands |
| Pixel lane still active | Keep this branch docs-only until #1325 frees scene files |

## Integration Rule

Each approved package gets exactly one authoritative candidate. Alternatives must stay clearly separated until rejected or selected. The Spatial pixel agent should never have to guess which asset is final.
