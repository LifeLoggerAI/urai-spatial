# URAI Spatial Engine — Tier-1 Architecture Snapshot

## Tier-1 Objective

Make **Star → Memory** interaction physically undeniable.

The purpose of Tier-1 is to prove that memory can be experienced as a real spatial object inside the URAI universe, not as a flat UI transition. The interaction must feel continuous, deterministic, and world-anchored.

---

## Tier-1 Lock Principles

Tier-1 is considered locked when the following remain true:

- Star positions are deterministic
- Star selection is store-driven
- Camera motion is interpolated, not instant
- Selected star becomes visually dominant
- Surrounding stars dim during focus
- Memory sphere appears at the selected star position
- Replay-related state is isolated from base interaction
- No unnecessary React update loops drive the core interaction
- No duplicate Canvas or duplicate scene roots exist
- No architecture changes are made to the Tier-1 spine after lock

---

## Core Systems

### 1. Deterministic starfield generation
The starfield must generate identical star coordinates for a given seed or fixed generation function. Spatial identity cannot drift between reloads.

### 2. Camera glide toward selected star
When a star is selected, the camera must move toward it through interpolation or controlled rig motion. The movement must feel physical and continuous.

### 3. Star bloom with surrounding star dim
The selected star becomes visually emphasized while non-selected stars dim. This creates directional focus and confirms the target in-world.

### 4. Memory sphere rendered in-world
A memory sphere must appear at the selected star coordinate, not as a DOM popup or detached overlay.

### 5. Image payload embedded in sphere
The selected memory can carry image or media payloads that belong to the sphere object and its world position.

### 6. Replay state isolation
Replay or playback logic must remain isolated from the base Tier-1 loop so the spatial kernel stays stable.

### 7. No React update loops
The core interaction must not depend on excessive state churn or full-scene React rerenders. Animation and interpolation should remain frame-safe.

---

## Key Engine Components

### `engine/spine/EngineSpine.tsx`
Primary orchestration layer for the Tier-1 spatial kernel. This file mounts and coordinates the core interaction systems.

### `engine/stars/Starfield.tsx`
Owns deterministic star generation, star rendering, and interaction hit detection.

### `engine/stars/StarGlowMaterial.ts`
Controls focused star bloom, non-focused dimming, and visual emphasis logic.

### `engine/scene/MemorySphere.tsx`
Renders the in-world memory object at the selected star position.

### `stores/spatialStore.ts`
Central state authority for selected star, mode transitions, and reset behavior.

---

## Interaction Loop

```text
User click
↓
star selected
↓
surrounding stars dim
↓
camera glides to star
↓
memory sphere appears
↓
state resets when another star is selected