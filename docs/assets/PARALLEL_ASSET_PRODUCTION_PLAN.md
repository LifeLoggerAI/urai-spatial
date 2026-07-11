# URAI Parallel Launch Asset Production Plan

Status: execution plan
Authority: issues #473, #518, #520, #523-#530
Canonical runtime: `LifeLoggerAI/urai-spatial/urai-tier1`
Canonical selected namespace: `urai-tier1/public/assets/urai/generated/**`

## Objective

Produce, review, and promote the launch-critical spatial and sensory assets in parallel without creating competing asset authorities, unsafe mega-branches, or unverified production claims.

## Non-negotiable rules

1. One canonical manifest and resolver.
2. Proof/fallback assets remain available until selected assets are independently approved.
3. Generation, evidence, promotion, merge, and deployment are separate phases.
4. One independently promotable asset per narrow PR.
5. No selected asset becomes `ready` from file existence alone.
6. Historical branch #463 is extraction/comparison input only and must never be merged wholesale.
7. Every selected model requires Draco or Meshopt compression, source/license records, SHA-256, visual proof, route proof, and exact-head checks.

## Parallel lanes

| Lane | Issue | Deliverables | Dependency |
|---|---:|---|---|
| Shared contract | #523 | art direction, scale, axes, pivots, material tokens, budgets, review sheet | none |
| Home | #524 | `home-entry-chamber-v1.glb` | #523 |
| Shared objects | #525 | `portal-ring-master-v1.glb`, `urai-orb-avatar-v1.glb` | #523 |
| Ground | #526 | `ground-world-terrain-v1.glb` | #523 and Portal anchor contract |
| Life Map | #527 | `life-map-galaxy-skybox-v1.hdr`, `life-map-memory-star-v1.glb` | #523 |
| Focus/Replay | #528 | `focus-memory-chamber-v1.glb`, `replay-memory-environment-v1.glb` | #523 and Memory Star contract |
| Sensory layer | #529 | materials, particles, loading, ambient audio | #523 |
| Independent QA | #530 | receipts, validation, visual review, promotion decisions | runs continuously |

## Wave plan

### Wave 0: Freeze contracts

- Approve #523.
- Freeze exact canonical paths and existing manifest caps.
- Freeze coordinate system, scale, origin, forward/up axes, pivots, walkable-floor convention, portal anchors, collision expectations, node naming, material tokens, animation-state names, mobile first-frame requirements, reduced-motion behavior, and source-package requirements.
- Record the exact contract commit in every production issue.

### Wave 1: Generate and salvage candidates in parallel

Each lane must create a clean current-contract candidate and may independently extract a historical candidate from #463 for comparison. No lane may merge historical branch history.

Required source package per candidate:

- source file and exported binary;
- tool/provider and version;
- prompt/version when applicable;
- source and license record;
- SHA-256 and byte size;
- bounds, triangles, nodes, materials, textures, clips, and external-reference report;
- optimization/compression report;
- desktop/mobile preview renders;
- known limitations.

### Wave 2: Normalize and validate

Run the existing forge and audit contracts plus asset-specific checks:

- `node scripts/forge-launch-critical-assets.mjs`
- `node scripts/normalize-launch-critical-assets.mjs`
- `node scripts/verify-launch-critical-assets.mjs`
- `node scripts/audit-launch-critical-artifact.mjs`
- `node scripts/validate-radiance-hdr.mjs`
- Khronos-compatible GLB validation
- `pnpm --dir urai-tier1 assets:validate`
- `pnpm --dir urai-tier1 typecheck`
- `pnpm --dir urai-tier1 build`

Reject candidates with unsafe paths, unsupported formats, external references, missing license/source data, mismatched hashes, budget violations, invalid transforms, extreme bounds, broken fallbacks, or inaccessible motion/audio behavior.

### Wave 3: Route-level visual review

For every target route capture and review:

- desktop first frame and interaction;
- mobile portrait and landscape;
- reduced motion;
- low-quality/adaptive quality;
- selected-asset load failure and fallback;
- loading transition;
- WebGL degraded/failure behavior;
- XR framing and locomotion where available;
- continuity across Home → Ground → Life Map → Focus → Replay.

A producer cannot provide the sole approval for their own asset.

### Wave 4: Narrow promotion PRs

Each promotion PR contains only:

- one selected binary or one inseparable artifact set;
- exact receipts and source/license evidence;
- preview/route evidence references;
- minimal manifest/resolver status update;
- minimal route wiring required for the selected asset;
- no deployment changes and no unrelated refactors.

Required PR evidence:

- exact-head validation results;
- independent QA decision from #530;
- fallback proof;
- rollback instruction;
- manifest entry remains non-ready until final reviewed commit.

### Wave 5: Integrated journey certification

After individual promotions:

1. verify canonical resolver selects approved assets and only intentional fallbacks;
2. run the full Home → Ground → Life Map → Focus → Replay journey;
3. verify state/query/history continuity;
4. verify adaptive quality and performance budgets;
5. verify mobile, reduced-motion, muted-audio, and fallback paths;
6. produce an exact-SHA integrated asset receipt;
7. keep production deployment under the separate protected release process in #518.

## Branch and PR policy

Suggested branches:

- `agent/asset-home-entry-chamber`
- `agent/asset-portal-ring`
- `agent/asset-urai-orb`
- `agent/asset-ground-world`
- `agent/asset-life-map-hdr`
- `agent/asset-memory-star`
- `agent/asset-focus-chamber`
- `agent/asset-replay-environment`
- `agent/asset-material-pack`
- `agent/asset-particles`
- `agent/asset-loading`
- `agent/asset-ambient-audio`

Never share a mutable asset branch between independent lanes. Rebase each promotion lane onto current `main` immediately before final exact-head checks.

## Decision states

Every asset must be explicitly classified as one of:

- `candidate`
- `rejected`
- `approved-for-promotion`
- `ready`
- `rolled-back`

`ready` requires exact binary, metadata, source/license, optimization, visual approval, route consumption, fallback proof, and exact-head checks to agree.

## Immediate execution order

1. Complete and merge the shared contract from #523.
2. Dispatch the existing `Launch Critical Asset Forge` manually to create a reviewable baseline candidate bundle.
3. Start #524-#529 concurrently from the frozen contract.
4. Start #530 immediately and use the particle atlas or loading sequence as the low-risk promotion rehearsal for #520.
5. Promote Portal and Orb early because they unlock visual continuity across multiple routes.
6. Promote Home and Ground next for the entry journey.
7. Promote Life Map HDR and Memory Star, then Focus and Replay.
8. Promote shared sensory artifacts independently as they pass.
9. Run integrated journey certification before any asset-complete launch claim.

## Definition of done

- Every launch-critical manifest entry has an explicit auditable state.
- Every selected asset has exact source, license, hash, optimization, visual, route, and fallback evidence.
- No unexplained binary or phantom manifest entry remains.
- No legacy repository or branch can silently become production authority.
- The complete spatial journey uses approved selected assets where ready and intentional fallbacks everywhere else.
- A bad or incomplete asset cannot merge, become `ready`, or deploy.