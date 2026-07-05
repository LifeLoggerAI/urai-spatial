# URAI Spatial V7 Architecture Plan

## Gate before V7

V7 does not begin until V1-V6 is in one of these two states:

1. `V1_V6_ASSET_SWITCH_READY_FINAL_ASSETS_PENDING` for architecture-only planning.
2. `V1_V6_ASSETS_ACTIVE` for production implementation.

The rule is simple: V7 must not reopen V1-V6 core routing just to turn assets on.

## V7 product thesis

V7 should be the expansion layer after the V1-V6 spine is stable:

- richer cinematic memory transitions
- deeper Replay-to-LifeMap continuity
- user-facing asset/scene personalization
- stronger XR/AR route readiness
- evidence-based launch proof surfaces

## V7 scope

### 1. Scene intelligence layer

Add a structured scene state layer that can answer:

- what route is active
- what memory/scene is selected
- what asset pack is available
- what fallback mode is active
- what user-safe transition is allowed

### 2. Asset pack runtime selection

V7 can introduce multiple asset packs, but it must use the V1-V6 registry model instead of hardcoding route assets.

Potential contract:

```ts
assetPackId -> route -> primary/mobile/accent assets
```

### 3. Replay continuity upgrade

V7 should connect:

```text
Life Map -> Focus -> Replay -> Unwind -> Life Map
```

as one continuous memory film loop rather than separate pages.

### 4. XR readiness expansion

V7 should preserve the existing XR/navmesh gate and expand only behind safe capability detection.

No XR feature should claim unavailable hardware behavior without fallback web content.

### 5. Release evidence surface

V7 should produce a route-level proof artifact:

```text
route -> assets -> fallback -> test -> screenshot/evidence
```

## Non-goals

V7 should not:

- replace V1-V6 route ownership
- weaken Firebase/privacy boundaries
- make E2E infra a deploy blocker again
- remove fallback safety
- ship assets without the strict asset-ready gate

## Suggested V7 branches

```text
v7/scene-intelligence
v7/asset-pack-runtime
v7/replay-continuity
v7/xr-readiness
v7/release-evidence-surface
```

## First V7 implementation target

Start with `v7/scene-intelligence` because it is the lowest-risk architecture layer and makes every later V7 lane cleaner.

## V7 entry checklist

- [ ] `node scripts/check-v1-v6-asset-ready.mjs` passes.
- [ ] `pnpm verify:v1-v6:non-assets` passes.
- [ ] V1-V6 final asset inventory has an owner/status decision.
- [ ] V7 branch is created from a green main.
- [ ] V7 does not modify V1-V6 core route ownership unless a gate proves it is required.
