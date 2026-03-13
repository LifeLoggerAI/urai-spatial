# URAI-Spatial Development Plan

This document contains a sequence of prompts to guide the development of the URAI-Spatial engine, focusing on completing Tier-2, initializing Tier-3, and then fully implementing Tier-3.

## Phase 1: Stabilize Tier-2 and Initialize Tier-3

**Instructions:** Use the following system prompt inside the Firebase IDE / Gemini for the urai-spatial repository. It instructs the environment to audit Tier-2, stabilize it, and begin Tier-3 preparation while verifying everything compiles and runs.

---

You are operating inside the URAI-Spatial repository, the spatial visualization engine of the URAI ecosystem.

Your mission is to complete, stabilize, and lock Tier-2 while preparing and safely initializing Tier-3.
Do not redesign the architecture. Audit the existing system, ensure everything works, and extend it only where required.

### URAI-SPATIAL ARCHITECTURE OVERVIEW

URAI-Spatial renders a deterministic life-map universe where:

Home → Sky → LifeMap → Star → Memory → Replay → Home

The system uses a deterministic starfield, spatial camera choreography, and interactive memory containers.

The spatial engine runs on:

- Next.js
- React Three Fiber
- TypeScript
- Zustand state management
- Firebase backend integration

### CURRENT TIERS

#### Tier-1 (Core Spatial Engine) — MUST ALREADY EXIST

- deterministic star generation
- starfield rendering layers
- camera navigation system
- spatial scene renderer
- spatial state store
- star selection logic
- base environment system

Verify Tier-1 compiles and runs correctly.

#### Tier-2 (Interactive LifeMap Layer) — MUST BE FULLY COMPLETE

Tier-2 turns the universe into a usable system.

Audit and confirm the following components exist and function:

**Spatial State System**

Verify `spatialStore` contains:

- `selectedStarId`
- `interactionLock`
- `inReplayMode`
- `cameraMode`
- `hoveredStarId`

Confirm store is stable and no syntax errors exist.

**Star Interaction System**

Verify:

- hover detection
- star selection
- selection highlight
- star zoom camera transition
- deselection returning to LifeMap

**Memory Container System**

Verify the memory container (sphere or container):

- opens when star selected
- loads memory content
- supports narrative metadata
- supports replay mode entry

**Replay Engine**

Confirm replay system exists and works:

- replay state toggle
- playback scene activation
- replay exit returns to LifeMap

**Camera Choreography**

Verify deterministic camera transitions between:

- Home
- Sky
- LifeMap
- Star
- Memory
- Replay

Ensure transitions are smooth and controlled.

**Environment System**

Verify environment layers:

- near stars
- far stars
- background fog
- light system

Ensure environment fades when memory is selected.

**Narrative Hooks**

Confirm integration points exist for:

- URAI Content
- Narrator system
- Memory metadata

These should allow stories or narrator content to attach to stars.

**Rendering Stability**

Confirm:

- project compiles with no errors
- Next.js build succeeds
- scene renders without runtime exceptions
- state transitions do not break rendering

If any Tier-2 system is missing, incomplete, or unstable:

Implement the missing component and integrate it into the spatial scene.

#### Tier-2 FINAL VERIFICATION

After audit and fixes, confirm:

**Tier-2 COMPLETE = TRUE**

Only confirm if:

- build succeeds
- spatial navigation works
- star interaction works
- memory container opens
- replay works
- camera transitions function

#### Tier-3 INITIALIZATION (DO NOT FULLY BUILD)

Begin preparing the architecture for Tier-3 expansion.

Create scaffolding only.

Tier-3 components to initialize:

**Advanced Environment Layer**

Create placeholder structure for:

- nebula systems
- constellation groupings
- planetary objects

**Narrator Layer**

Create a system hook allowing narrator guidance within the spatial map.

**Exploration Modes**

Prepare camera mode architecture for:

- guided exploration
- free flight
- story path

**Immersive Device Support**

Prepare render abstraction layer so the scene can later support:

- Web
- VR
- AR
- XR

**Spatial Story Scenes**

Create scene loader architecture allowing stories from URAI Content to appear as immersive scenes.

Do NOT fully implement these features yet. Only create architecture scaffolding.

### VALIDATION TASKS

After completing the audit and scaffolding:

1.  Run a full TypeScript check
2.  Ensure Next.js builds successfully
3.  Ensure no runtime rendering errors occur
4.  Ensure spatial scene loads correctly

### FINAL REPORT

When finished provide a structured report:

- Tier-1 status
- Tier-2 audit results
- Tier-2 completion confirmation
- Tier-3 scaffolding created
- Remaining work (if any)

Only declare Tier-2 complete if all systems pass validation.

**Important rules:**

- do not redesign the engine
- do not remove deterministic star logic
- do not introduce experimental frameworks
- maintain existing architecture
- focus on stabilization and verification

The goal is:

- Tier-2 fully complete
- Tier-3 architecture initialized
- URAI-Spatial stable and ready for expansion

---

## Phase 2: Complete Tier-3 Implementation

**Instructions:** After successfully completing Phase 1, use this prompt to build out the full Tier-3 functionality based on the created scaffolding.

---

You are operating inside the URAI-Spatial repository. Tier-1 is locked, and Tier-2 is complete and stable. The architectural scaffolding for Tier-3 has been initialized.

Your mission is to fully implement the Tier-3 systems, transforming URAI-Spatial from a visualization tool into an immersive storytelling platform.

### TIER-3 IMPLEMENTATION TASKS

Based on the existing scaffolding, implement the following systems.

**1. Advanced Spatial Environment**

- **Nebula Layers:** Implement volumetric nebula fields and dynamic fog layers that react to camera distance and emotional state.
- **Constellation Groupings:** Develop logic to visually group and connect related stars into constellations.
- **Large-Scale Structure:** Add distant galaxy backdrops and spatial clusters to give the universe depth.
- **Emotional Atmospheres:** Connect the environment's color and lighting to the active memory's emotional metadata.

**2. Narrator Interaction Layer**

- **Narrator Controller:** Implement a `NarratorController` that can be triggered by spatial events (e.g., entering a region, selecting a star).
- **URAI Content Integration:** Connect the controller to the URAI Content system to fetch and display story text, summaries, or play voice narration during navigation.

**3. Immersive Exploration Modes**

- **Guided Path Traversal:** Implement a mode to guide the user through a pre-defined sequence of stars, representing a narrative or story chapter.
- **Controlled Free-Flight:** Create a camera mode allowing limited free-flight exploration between stars, constrained within defined boundaries.

**4. Spatial Story Scenes**

- **Scene Module Loader:** Build the functionality to load and render "scene modules" when a star is activated. These modules are mini-experiences, such as a narrated memory playback or an animated visual story, connecting to the URAI Content story engine.

**5. Immersive Platform Abstraction (WebXR)**

- **Renderer Abstraction:** Refactor the rendering and camera systems to support WebXR. The scene and input controllers should be modular enough to handle both 2D screen and VR/AR headset configurations. Full implementation is not required, but the abstraction layer must be in place.

**6. Emotional Visualization Systems**

- **Star Auras and Glows:** Implement dynamic aura and glow effects around stars and constellations that represent emotional states or relationships between memories.
- **Dynamic Color States:** Create systems for global emotional color states that affect the entire scene's mood based on the current narrative context.

**7. Performance and Scaling Architecture**

- **Instanced Mesh Optimization:** Ensure all starfield layers and repeated geometries use instanced rendering to handle thousands of objects efficiently.
- **Level-of-Detail (LOD):** Implement LOD for stars and other objects to reduce complexity during deep zoom transitions.

**8. Story Path Logic**

- **Curated Experience Engine:** Develop a system that can read a "story path" (a sequence of star IDs and narrative triggers) from URAI Content and guide the user through it. This will be the basis for presenting "life chapters" or "growth arcs."

### VALIDATION AND COMPLETION

- Ensure all new systems are integrated cleanly without breaking Tier-1 or Tier-2 functionality.
- The project must compile without errors.
- The application must run smoothly with high performance, even with thousands of stars.
- All new features must be verifiable and testable.

Upon completion, Tier-3 will be considered implemented, and URAI-Spatial will be a complete spatial storytelling engine.
