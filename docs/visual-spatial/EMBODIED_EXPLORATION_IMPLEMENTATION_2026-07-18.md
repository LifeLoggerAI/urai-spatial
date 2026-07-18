# URAI Embodied Exploration Implementation — 2026-07-18

## Authority

- Repository: `LifeLoggerAI/urai-spatial`
- Application: `urai-tier1`
- Starting integrated visual head: `b8487ba6752b6d38652ae825cf2270cc409d8077`
- Movement branch: `feat/embodied-exploration-convergence-20260718`
- Verified production before this lane: `1770a4967e7501d82d55385c9584a8f24231eced`
- Production mutation from this branch: none until exact-head verification, protected merge, and protected release complete
- Home companion ownership: Home only; the companion remains unmounted in Life Map

## Product movement language

### Home — walk and inhabit

The canonical Home runtime now mounts `EmbodiedHomeSpatialCanvas` rather than the directed fixed-camera composition.

Implemented controls:

- slow WASD and arrow-key walking;
- click-to-walk on a bounded sanctuary surface;
- drag-to-look with bounded pitch and no pointer lock;
- mobile directional controls and touch drag;
- smooth acceleration and deceleration;
- sanctuary bounds and collision radii around the embodied self and Orb;
- physical approach states for the Orb, embodied self, Ground doorway, and Life Map threshold;
- Enter/Space interaction at a nearby object or threshold;
- `R` orientation reset and Escape reset inside Home;
- direct-access Orb, Ground, and Life Map controls that remain available without movement;
- reduced-motion-aware speed and camera damping;
- existing WebGL recovery and non-WebGL Home fallback retained.

No sprinting, jumping, crouching, shooter controls, head bob, or pointer lock are introduced.

### Ground — walk, work, and enter chambers

Ground now mounts `EmbodiedGroundScene` as its transparent Three.js interaction and navigation owner over the authored environment art.

Implemented systems:

- first-person arrival at the overlook;
- a walkable route into the Ground Nexus;
- bounded WASD/arrow and click-to-walk navigation;
- drag-to-look without pointer lock;
- mobile movement controls;
- collision volumes around all twelve destination structures;
- visible path network from the overlook through the Nexus to threshold, civic, continuity, and deep layers;
- enterable chamber threshold architecture;
- proximity detection and Enter/tap-again threshold crossing;
- workforce and council presences distributed through the world;
- blocked, degraded, offline, owner-boundary, and availability states retained in world geometry and semantic controls;
- direct destination rail retained for essential, accessible, and fast navigation;
- identical route destination whether entered physically or selected directly;
- `R` reset and Escape return to Home.

### Life Map — float, glide, orbit, and return

Life Map remains its own independent Orb-free realm. The existing drag, wheel, click-to-glide, selected-memory, Focus, Replay, and overview camera behavior is preserved.

The independent input boundary now adds:

- `W/S` and Up/Down depth glide through the memory field;
- `A/D`, `Q/E`, and Left/Right constellation stepping through semantic memory controls, causing canonical camera glide to the selected memory;
- mobile previous, next, deeper, retreat, and overview controls;
- `R`, `O`, or Home-key orientation reset to overview;
- two-stage Escape behavior retained;
- live movement announcements;
- concise dismissible movement help;
- gesture isolation for accessibility controls, recovery surfaces, memory portals, and movement controls;
- no Home Orb, shared companion, or pointer lock.

## Shared architecture

`src/spatial/navigation/EmbodiedNavigation.tsx` owns:

- keyboard and virtual movement input abstraction;
- drag-look handling;
- movement target cancellation and click-to-walk targeting;
- acceleration/deceleration damping;
- rectangular movement bounds;
- circular collision resolution;
- mobile controls;
- movement help UI.

Realm scenes own only realm-specific spawn points, bounds, obstacles, interactions, thresholds, and emotional movement semantics.

## Accessibility and safety boundary

- Embodied movement supplements rather than replaces semantic direct access.
- No forced pointer lock.
- All direct controls retain keyboard focus and minimum 48px targets.
- Essential privacy, consent, safety, exit, and destination controls do not require walking.
- Reduced-motion behavior remains explicit.
- WebGL recovery and non-WebGL fallbacks remain authoritative.
- Life Map control surfaces are excluded from camera gesture capture.
- The Home Orb remains absent from Life Map.

## Verification

`tests/embodied-exploration-contract.test.mjs` is registered in both focused unit runners and fails closed on:

- loss of WASD/arrow/touch movement;
- removal of damping, boundaries, or collision;
- fixed-camera Home ownership returning;
- non-walkable Ground ownership returning;
- loss of Ground paths, Nexus, thresholds, workforce state, or direct navigation;
- loss of Life Map depth/constellation controls or overview recovery;
- addition of pointer lock, sprint, jump, crouch, or a Life Map companion Orb;
- removal of direct exits and semantic controls.

## Current truth boundary

This document records source implementation only. It does not claim CI success, visual acceptance, merge, deployment, production parity, physical-device proof, or live verification until those receipts exist on one unchanged exact head.
