# URAI Spatial V7-V10 Completion Roadmap

## Status boundary

V1-V6 are the core spine and asset activation lane.

V7-V10 must not reopen V1-V6 fundamentals unless a release gate proves a regression.

The progression is:

```text
V1-V6: core spine + final asset activation
V7: scene intelligence + runtime continuity
V8: autonomous product evolution loop
V9: ecosystem intelligence layer
V10: civilization-scale simulation / long-horizon dynamics
```

## Required prerequisite before V7 production work

V7 can be planned now, but production implementation should wait for one of these states:

```text
V1_V6_ASSET_SWITCH_READY_FINAL_ASSETS_PENDING
```

or, for public visual launch:

```text
V1_V6_ASSETS_ACTIVE
```

The strict asset gate remains:

```bash
node scripts/check-v1-v6-asset-ready.mjs --strict
```

---

# V7 — Scene Intelligence + Continuity Layer

## Goal

Turn the existing route spine into one coherent scene/runtime system.

V7 answers:

- Where is the user in the URAI world?
- What memory/scene is active?
- What asset pack is active?
- What fallback state is active?
- What route transition is safe?
- What evidence proves the scene is working?

## Build pieces

### 1. Scene state contract

Add a typed contract for route/scene state.

Suggested file:

```text
urai-tier1/src/spatial/scene/sceneState.ts
```

Expected fields:

```ts
routeId
sceneId
memoryId
assetPackId
fallbackMode
transitionState
privacyMode
```

### 2. Scene registry

Add a registry that maps V1-V6 routes into scene metadata.

Suggested file:

```text
urai-tier1/src/spatial/scene/sceneRegistry.ts
```

### 3. Scene continuity bridge

Connect:

```text
Home -> Life Map -> Focus -> Replay -> Unwind -> Life Map
```

as a continuous user journey.

### 4. Scene evidence report

Generate:

```text
audit/v7/scene-continuity-report.json
```

## V7 completion gates

```bash
pnpm verify:v1-v6:non-assets
node scripts/check-v1-v6-asset-ready.mjs
node scripts/check-v7-scene-continuity.mjs
pnpm lock:build
```

## V7 done definition

```text
V7_SCENE_INTELLIGENCE_READY
```

---

# V8 — Autonomous Product Evolution Loop

## Goal

Turn URAI from a static app into a system that observes product evidence and proposes safe improvements.

V8 is not uncontrolled self-writing code. It is observe-first, report-first, PR-gated evolution.

## Build pieces

### 1. Product signal collector

Collect non-private repo/runtime evidence:

- route health
- release evidence
- asset activation state
- smoke results
- known degraded lanes
- docs/release state

Suggested file:

```text
scripts/product-evolution/observe.mjs
```

### 2. Gap detector

Find explicit gaps:

- missing route evidence
- missing asset proof
- stale docs
- incomplete gate reports
- failing non-critical lanes

Suggested file:

```text
scripts/product-evolution/detect-gaps.mjs
```

### 3. Proposal generator

Generate markdown proposals only.

Suggested output:

```text
audit/v8/product-evolution-proposals.md
```

### 4. PR safety rule

V8 can create proposal branches, but it must not auto-merge.

## V8 completion gates

```bash
node scripts/product-evolution/observe.mjs
node scripts/product-evolution/detect-gaps.mjs
node scripts/product-evolution/propose.mjs
pnpm lock:static
pnpm lock:build
```

## V8 done definition

```text
V8_PRODUCT_EVOLUTION_OBSERVER_READY
```

---

# V9 — Ecosystem Intelligence Layer

## Goal

Coordinate multiple URAI systems/repositories/products as one ecosystem without mixing ownership boundaries.

V9 observes interactions between:

- urai-spatial
- asset-factory
- URAI core app
- Studio/handoff systems
- release workflows
- docs/evidence trails

## Build pieces

### 1. Ecosystem registry

A machine-readable registry of participating systems.

Suggested file:

```text
docs/ecosystem/URAI_ECOSYSTEM_REGISTRY.json
```

### 2. Cross-system dependency map

Map dependencies:

```text
asset factory -> spatial assets
studio -> spatial handoff
firebase -> deploy/runtime
GitHub actions -> release evidence
```

Suggested file:

```text
docs/ecosystem/URAI_DEPENDENCY_GRAPH.md
```

### 3. Ecosystem evidence collector

Generate:

```text
audit/v9/ecosystem-intelligence-report.json
```

### 4. Risk/orchestration model

Classify risks:

- blocker
- degraded
- asset pending
- evidence missing
- external dependency
- safe to ship

## V9 completion gates

```bash
node scripts/ecosystem/check-registry.mjs
node scripts/ecosystem/collect-evidence.mjs
node scripts/ecosystem/report.mjs
pnpm verify:v1-v6:non-assets
```

## V9 done definition

```text
V9_ECOSYSTEM_INTELLIGENCE_READY
```

---

# V10 — Civilization-Scale Simulation / Long-Horizon Dynamics

## Goal

Build the highest-level URAI simulation layer: not control, not surveillance, but scenario modeling for how memory, identity, work, AI, institutions, and digital infrastructure evolve over time.

V10 is a strategic simulation and research layer. It should remain privacy-preserving and advisory.

## Build pieces

### 1. Scenario schema

Define scenario inputs:

```text
actors
institutions
technologies
time horizons
constraints
risks
benefits
unknowns
```

Suggested file:

```text
docs/simulation/V10_SCENARIO_SCHEMA.md
```

### 2. Long-horizon simulator stub

Generate structured scenario outputs without claiming real-world prediction certainty.

Suggested file:

```text
scripts/simulation/run-v10-scenario.mjs
```

### 3. URAI impact scenarios

Create initial scenarios:

- personal memory operating systems
- AI-native solo founders
- institution-scale tools for people outside institutions
- clinical/advisory validation pathways
- autonomous product evolution governance

Suggested file:

```text
docs/simulation/URAI_LONG_HORIZON_SCENARIOS.md
```

### 4. Safety and governance boundary

V10 must clearly state:

- no individual prediction
- no manipulation engine
- no hidden behavioral control
- no privacy-invasive modeling
- advisory simulation only

Suggested file:

```text
docs/simulation/V10_SAFETY_BOUNDARY.md
```

## V10 completion gates

```bash
node scripts/simulation/run-v10-scenario.mjs --example
node scripts/simulation/check-safety-boundary.mjs
pnpm lock:static
```

## V10 done definition

```text
V10_LONG_HORIZON_SIMULATION_READY
```

---

# Master completion sequence

## Step 1 — Finish V1-V6 asset activation

```bash
node scripts/check-v1-v6-asset-ready.mjs --strict
```

Target:

```text
V1_V6_ASSETS_ACTIVE
```

## Step 2 — Build V7

Target:

```text
V7_SCENE_INTELLIGENCE_READY
```

## Step 3 — Build V8

Target:

```text
V8_PRODUCT_EVOLUTION_OBSERVER_READY
```

## Step 4 — Build V9

Target:

```text
V9_ECOSYSTEM_INTELLIGENCE_READY
```

## Step 5 — Build V10

Target:

```text
V10_LONG_HORIZON_SIMULATION_READY
```

---

# Non-negotiable rule

Do not allow V7-V10 expansion to destabilize V1-V6.

Every future layer must be:

```text
additive
gated
evidence-producing
privacy-preserving
rollback-safe
```

That is how URAI moves from app to system without turning back into chaos.
