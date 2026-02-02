
# URAI-SPATIAL — Project Charter

## One-line purpose
urai-spatial is URAI’s Spatial Engine — the AR / VR / XR runtime, world model, and asset pipeline that turns memories, timelines, and insights into places you can step into.

If URAI becomes a world, this is the world layer.

## Mission
To render human life as navigable space — rooms, portals, stars, and environments — across AR, VR, XR, and WebXR, with cinematic quality, privacy-first design, and deterministic asset pipelines.

## What this project OWNS (hard boundaries)
1. **Spatial Runtime**
    - Scene graph & world state
    - Rooms, portals, doors, memory environments
    - Camera rigs, transitions, locomotion
    - Interaction system (gaze, grab, point, teleport)
2. **AR Systems**
    - World anchors, plane anchors, image anchors
    - Environment understanding (planes / meshes)
    - Occlusion, depth, light estimation
    - “Place a memory in the real world”
3. **VR / XR Systems**
    - XR session lifecycle
    - Controller + hand tracking abstraction
    - Comfort + accessibility modes
    - Seated / standing / room-scale support
4. **Asset & World Build Pipeline**
    - Import → normalize → optimize → publish
    - GLB as canonical (USDZ optional)
    - LODs, draco compression, texture variants
    - Deterministic builds + versioning
5. **Spatial Data Layer (Firebase)**
    - Worlds, scenes, entities, anchors
    - Runtime configs per device
    - Scene publishing + rollback
6. **Spatial Safety & Consent**
    - No raw camera storage by default
    - Explicit opt-in for environment persistence
    - Redaction + private-space modes
    - Local-first whenever possible

## What this project does NOT own
These are explicitly out of scope:

- Life narrative logic, insights, forecasting (core URAI)
- Marketing sites, company pages (urai-labs-llc)
- Nonprofit ops or grants (urai-foundation)
- Clip generation / social exports (asset-factory)
- Payments, subscriptions, growth funnels

urai-spatial is a runtime + pipeline, not the brain or the business.

## Canonical user experiences (must be supported)
1. **Memory Room Formation**
    - User enters StarWorld
    - A room materializes around them in phases
    - Characters enter / exit
    - Narration drives lighting + camera beats
2. **AR Memory Anchors**
    - Place an orb / star / portal in a real room
    - Anchor persists (optionally)
    - Tap → transition into full XR room
3. **Life-Map Walkthrough (XR)**
    - Timeline becomes physical space
    - Stars as spatial nodes
    - Walk, teleport, or glide through life
4. **Shared Spatial Session (later)**
    - Invite presence
    - Synced narration beats
    - Shared anchors & portals

## Core concepts (non-negotiable)
- **World**: A universe container (e.g. StarWorld)
- **Scene**: A loadable spatial state inside a world
- **Entity**: Any object in a scene (portal, wall, character, orb)
- **Anchor**: A spatial reference (AR or virtual)
- **Memory Room**: A scene generated from a memory + template
- **Spatial Build**: A deterministic output of assets + scene config

## Firestore Canonical Collections
These are the minimum “real” objects:

- `worlds`
- `scenes`
- `entities`
- `anchors`
- `assets`
- `builds`
- `xrSessions` (optional telemetry)
- `deviceProfiles`

Everything else is derived.

## Repo Structure (clean & future-proof)
```
urai-spatial/
├─ apps/
│  ├─ spatial-web/        # WebXR (Three / R3F)
│  ├─ spatial-admin/      # Internal scene + asset browser
│  └─ spatial-unity/      # Optional native XR later
│
├─ packages/
│  ├─ spatial-core/       # Scene graph, entities, runtime
│  ├─ spatial-xr/         # XR session + input abstraction
│  ├─ spatial-formats/    # Scene JSON, GLTF extensions
│  └─ spatial-effects/    # Fog, transitions, materializers
│
├─ functions/
│  ├─ asset-builds/
│  ├─ scene-publish/
│  └─ validation/
│
└─ infra/
   ├─ firestore.rules
   ├─ indexes.json
   └─ storage.rules
```

## MVP = “Ship-Ready”
`urai-spatial` is MVP-complete when all of these exist:

1. WebXR viewer that loads `Scene JSON` + GLBs
2. Asset pipeline that:
    - Ingests GLB
    - Outputs optimized build
    - Versions deterministically
3. One flagship experience:
    - StarWorld → portal → Memory Room formation
4. Admin UI to publish / rollback scenes
5. Locked Firestore + Storage rules

## Design principles (this is the vibe lock)
- Cinematic > gamified
- Spatial storytelling over UI
- Minimal controls, maximum presence
- Magical but deterministic
- Private by default
- Device-adaptive quality
- Everything feels intentional

## Long-term north star
URAI becomes a place people visit — not an app they tap.

`urai-spatial` is the foundation that makes that true.
