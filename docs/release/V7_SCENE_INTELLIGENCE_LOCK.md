# URAI Spatial V7 Scene Intelligence Lock

Status: `V7_SCENE_INTELLIGENCE_READY`

## Purpose

V7 opens the next architecture layer after the V1-V6 asset-ready switch. This lock defines the first V7 lane without reopening the V1-V6 route spine.

## First V7 lane

`v7-scene-intelligence` is the first lane because it is additive and low-risk. It introduces a scene-state contract that can describe the active route, selected memory, asset pack, fallback mode, transition policy, boundary tag, and release evidence tag.

## Guardrails

V7 must preserve:

- V1-V6 route ownership
- fallback-safe runtime behavior
- reduced-motion safety
- existing release gates
- non-blocking E2E infra policy
- strict final-asset activation before final-asset claims

## Required contract

The release contract lives at:

```text
release/v7-scene-intelligence-contract.json
```

The checker lives at:

```text
scripts/check-v7-scene-intelligence.mjs
```

Run:

```bash
node scripts/check-v7-scene-intelligence.mjs
```

Expected decision:

```text
V7_SCENE_INTELLIGENCE_LOCKED
```

## What this completes

This completes the V7 architecture opening move. It does not claim final V1-V6 assets are present. It makes V7 ready to build from a green V1-V6 asset-ready base.
