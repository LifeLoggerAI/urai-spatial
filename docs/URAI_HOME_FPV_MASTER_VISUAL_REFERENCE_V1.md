# UrAi First-Person Home — Master Visual Reference V1

Authority date: 2026-09-17
Repository: `LifeLoggerAI/urai-spatial`
Current convergence authority: `converge/final-canon-spatial-20260922` / PR #1296
Historical creation audit head: `d4362831c28def1ac4c27a2c2df5b27ef7133d6b` (provenance only). Current PR #1296 source and exact-head evidence govern over the historical creation branch. This reference contract intentionally does not self-bind to its own commit as exact-head proof.
Status: `CURRENT_CANDIDATE_REFERENCE / NOT LITERAL-PIXEL ACCEPTANCE / NOT GOLD MASTER`

## Purpose

This document defines the current Home continuity contract for reference-image generation, environment art, camera, Avatar presentation, bodyless first-person Home, Orb, Passport, mobile, accessibility, implementation, and literal-pixel inspection. Current non-XR Home begins in governed `HOME_PRESENTATION` with a visible Avatar, then enters bodyless `AVATAR_HOME_FIRST_PERSON` through Avatar activation; older direct-first-person-only wording is superseded.

It does **not** declare generated concept art, source code, or CI to be visual acceptance. `docs/URAI_VISUAL_GOLD_MASTER_MANIFEST_V1.md` remains the release/control-plane authority. Any later source-head move requires affected runtime proof and literal pixels to be regenerated.

## Truth classes

Every statement and artifact in this package must be classified as one of:

1. `CURRENT_RUNTIME_FACT` — directly present in current PR #1296 source/runtime authority.
2. `REFERENCE_TARGET` — approved design target that must still be implemented and literally inspected.
3. `MISSING_REPLACEMENT_REQUIRED` — required visual system/art not yet production-authoritative.
4. `HISTORICAL_PROVENANCE_ONLY` — retained only to explain lineage and must not override current canon.

Polish must never turn a `REFERENCE_TARGET` into a claim that the runtime already implements it.

## Locked experience continuity

- Ordinary non-XR Home opens in governed `HOME_PRESENTATION` with the visible user Avatar as the embodiment anchor.
- Selecting the Avatar initiates `AVATAR_EMBODIMENT_TRANSITION` into persistent `AVATAR_HOME_FIRST_PERSON` in the same Home.
- Desktop/mobile first-person Home is camera-only and bodyless: no visible Avatar, hands, arms, torso, legs, feet, or tool rig.
- Escape from stable `AVATAR_HOME_FIRST_PERSON` initiates `EMBODIMENT_UNWIND` and returns exactly one layer to `HOME_PRESENTATION`.
- Broad Sky owns Home → Life Map ascent. No localized portal, ring, white dot, doorway, or hotspot.
- Terrain/material owns Home → Ground descent. No portal, doorway, radial tunnel, or generic vortex.
- The authored Home Orb remains a physical conversational presence.
- Passport is a physical first-person-Home ownership/authority artifact, not a portal.
- Desktop/mobile and reduced-motion references must preserve the same semantic world and destination ownership.

## Master Image 01 rule

`URAI_HOME_FPV_MASTER_01` is the **master candidate reference frame**, not an independent fantasy illustration.

It must inherit the current Home geography, terrain language, path logic, atmosphere, broad Sky, Orb identity, and first-person camera contract. Later frames may change camera, Orb state, time, weather, accessibility state, or contextual UI, but may not silently redesign the world.

The 16-frame package is a working production-reference set. It does **not** replace the VGM inventory or literal-pixel Gold-Master gate.

## Current runtime spatial facts

### First-person camera

- Home eye height: `1.64 m`.
- Stable first-person FOV: `58°` landscape, `66°` portrait.
- No synthetic head bob.
- Current first-person walk speed: `2.6` world-units/s.
- Current acceleration: `8`.
- Current deceleration: `10.5`.
- Current walk radius: `14` world units.
- Presentation camera default snapshot: `[0, 1.75, 7.85]`, yaw `0`, pitch `0.02`.

### Non-XR body authority

- Current desktop/mobile Home presentation contains the governed visible user Avatar.
- After Avatar activation, first-person Home is camera-only and bodyless; no synthetic hands, arms, torso, legs, feet, or first-person body rig are authorized.
- The same world, Orb, Sky and Ground ownership persist across the presentation-to-first-person transition.
- A separately governed self-view or future XR body/likeness surface must earn its own source, consent, provenance and visual acceptance; it never authorizes ordinary flat-screen first-person hands/body.

### Avatar presentation → bodyless first-person entry

- Home initializes in stable `HOME_PRESENTATION`.
- The governed visible Avatar is the activation gate into `AVATAR_HOME_FIRST_PERSON`.
- The embodiment transition moves the camera into the Avatar viewpoint without replacing the Home, Orb, Sky or Ground.
- Stable first-person FOV remains `58°` landscape / `66°` portrait.
- Passport and other first-person-only interactions become available only after stable first-person ownership is reached.
- Escape from stable first-person Home unwinds through `EMBODIMENT_UNWIND` to `HOME_PRESENTATION`.

Current embodiment timing values are implementation facts, not independent visual authority; acceptance remains exact-head and literal-pixel bound.

## Master world composition

### Foreground

`REFERENCE_TARGET`

The first several meters must survive close first-person scrutiny: sculpted terrain, PBR soil/stone/organic response, micro-roughness, contact shadowing, restrained debris, and path-edge variation. No flat platform, obvious tiling, generic grass plane, or low-detail filler.

### Midground

`CURRENT_RUNTIME_FACT + REFERENCE_TARGET`

Current runtime uses a sculpted sanctuary landscape with a winding central path, stratified terrain, living-grove forms, and authored Home elements. The master frame must preserve that spatial continuity while allowing **source-governed** personal-life elements to be added as they become authorized.

Home/work/meaningful-place/relationship objects must never be presented as autobiographical merely because they look plausible. Personalized objects require provenance fidelity:

- `confirmed` — source-backed and permitted;
- `partial` — bounded uncertainty shown honestly;
- `unknown` — no autobiographical claim.

Generic fallback scenery remains explicitly non-autobiographical.

### Background

`REFERENCE_TARGET`

The world must continue beyond the immediate interaction radius through believable terrain, atmospheric perspective, distant silhouettes, and restrained environmental life. No fog wall may be used to hide unfinished geometry.

### Sky

`CURRENT_RUNTIME_FACT + REFERENCE_TARGET`

Sky is broad, atmospheric, and spatially legible. It owns Life Map ascent as an environmental direction, not as a localized portal object. The master frame must show enough Sky that upward possibility is perceptible without a portal ring.

### Ground relationship

`CURRENT_RUNTIME_FACT + REFERENCE_TARGET`

Ground is entered through physical terrain/material crossing. Root/geological/subsurface cues may foreshadow depth, but no glowing hole, doorway, or radial tunnel is allowed.

## Orb master authority

`CURRENT_RUNTIME_FACT`

Current authored model: `/assets/urai/generated/models/urai-orb-avatar-v1.glb`.

Current placement/scale behavior:

- runtime base position: `[1.02, terrain, 0.72]`;
- visible field radius: `0.50 m`;
- field vertical scale: `1.04`;
- terrain clearance: `0.015 m`;
- rest center derives from field radius × vertical scale + terrain clearance.

Current semantic states include `dormant`, `idle`, `attention`, `listening`, `thinking`, `speaking`, `guiding`, `reflecting`, `calming`, `privacy`, `warning`, and `transition`.

Current macro vertical amplitudes are deliberately small:

| State | Vertical hover amplitude |
|---|---:|
| idle | 0.018 m |
| attention | 0.009 m |
| listening | 0.008 m |
| thinking | 0.011 m |
| speaking | 0.009 m |
| calming | 0.005 m |
| privacy | 0.002 m |
| warning | 0.002 m |
| transition | 0.030 m |

The Orb must remain materially legible before bloom. World light from the Orb stays subordinate to the environment. Audible speaking animation is permitted only when actual acoustic playback/device speech is occurring; text-only output must not fake acoustic speaking.

### Orb reference images 02–04

All three must use the exact same Orb construction and Home geography:

- `URAI_HOME_FPV_ORB_PRESENCE_02` — idle/presence.
- `URAI_HOME_FPV_ORB_LISTEN_03` — listening state; more ordered and quieter, not louder.
- `URAI_HOME_FPV_ORB_THINK_04` — thinking state; richer internal organization without spinner/progress-bar language.

Any image that redesigns the Orb between these states fails continuity.

## Passport authority

`CURRENT_RUNTIME_FACT / CURRENT_CANDIDATE_ART`

Passport currently mounts only in unlocked `AVATAR_HOME_FIRST_PERSON` and captures the exact current FP origin before travel so return can restore the prior Home camera/state.

Current candidate physical object:

- position `[3.15, 0.62, 1.85]`;
- yaw `-0.34 rad`;
- main body approximately `0.82 × 0.90 × 0.12 m`;
- dark green-gray durable physical material;
- explicitly marked in source as `candidate-requires-literal-pixel-acceptance`.

Its semantic role is ownership, identity, consent, permissions, and system relationship. It is not a portal, settings gear, airport desk, or novelty passport book.

## Global Emotional Field Earth

`CURRENT_RUNTIME_FACT / CURRENT_CANDIDATE_ART`

Current convergence source contains a deterministic first-person Home Earth candidate distinct from Location Map and Personal Emotional Weather. Its truth boundary is fail-closed: the default is visibly unavailable/provider-not-activated, and source explicitly forbids fabricated emotional activity, individual dots, exact user/household location, or reuse of private location-map identity.

Therefore:

- Master Image 01 may include the current Earth candidate only as a runtime candidate, never as already accepted Gold-Master pixels.
- Earth must read as physically plausible Earth first.
- Safe aggregate emotional-field information is an overlay on Earth identity and may appear only when a governed aggregate provider/privacy-threshold boundary actually publishes it.
- Truth states remain `unavailable`, `suppressed`, and `safely published aggregate`.
- Never show individual dots, exact locations, raw private emotion, household identity, or fake activity.
- Exact-head literal pixels, accessibility, privacy, responsive and performance acceptance remain open.

## Personal Emotional Weather

`CURRENT_STATE_MODEL / ACTIVE_HOME_ATMOSPHERE_BINDING_SOURCE_CONVERGED / CURRENT_CANDIDATE_REFERENCE`

The current state/signal authority exists, including uncertainty-aware/fail-closed modes and weather-tone semantics. Current convergence source binds that model directly into the canonical V223 Home atmospheric owner: `clear → calm`, `soft → reflective`, `active → energized`, `heavy → heavy`, `recovering → hopeful`, and `forming → uncertain`. The world exposes the source tone, mapped atmosphere, scene mode, loading state, and disclosed-synthetic-review flag for deterministic proof.

Private Personal Emotional Weather must remain distinct from ordinary meteorological weather and the Global Emotional Field and must never imply diagnosis.

Required next boundary before visual promotion:

- preserve the new source binding under exact-head unit/type/build proof;
- preserve the same geography across weather states;
- capture desktop/mobile/reduced-motion/reduced-stimulation/fallback state pixels;
- label synthetic review fixtures explicitly as not user data;
- literally inspect and accept the resulting same-world grammar.

Concept imagery remains reference-only until exact-head runtime proof and literal-pixel acceptance are earned.

## Candidate 16-frame reference package

These files are candidate production references and must all inherit `URAI_HOME_FPV_MASTER_01` continuity:

1. `URAI_HOME_FPV_MASTER_01` — canonical FP Home hero.
2. `URAI_HOME_FPV_ORB_PRESENCE_02` — Orb idle presence.
3. `URAI_HOME_FPV_ORB_LISTEN_03` — Orb listening.
4. `URAI_HOME_FPV_ORB_THINK_04` — Orb thinking.
5. `URAI_HOME_FPV_PERSONAL_ARCH_05` — source-governed personal-life architecture/state.
6. `URAI_HOME_FPV_PURPOSE_06` — source-governed work/purpose state.
7. `URAI_HOME_FPV_SKY_07` — broad Sky / ascent relationship.
8. `URAI_HOME_FPV_GROUND_08` — terrain-owned descent relationship.
9. `URAI_HOME_FPV_GEF_EARTH_09` — current fail-closed Global Emotional Field Earth runtime candidate; not visual Gold Master until exact-head pixels are accepted.
10. `URAI_HOME_FPV_NIGHT_10` — same geography at night.
11. `URAI_HOME_FPV_PERSONAL_WEATHER_11` — Personal Emotional Weather candidate; state authority and canonical Home atmosphere source binding are converged, while literal responsive/reduced-state acceptance remains open.
12. `URAI_HOME_FPV_REDUCED_STIM_12` — same geography, reduced stimulation.
13. `URAI_HOME_FPV_CONTEXT_UI_13` — contextual UI without dashboard takeover.
14. `URAI_HOME_FPV_PASSPORT_14` — physical Passport candidate in FP Home.
15. `URAI_HOME_FPV_WIDE_15` — wide continuity establishing frame.
16. `URAI_HOME_FPV_IDLE_16` — quiet stillness proof.

## Camera/lens acceptance

- Desktop/landscape master: `58°` FP FOV.
- Mobile/portrait master: `66°` FP FOV.
- Portrait must be authored, not a desktop crop.
- Default exploration uses deep environmental readability; shallow DOF is exceptional and temporary.
- No fisheye, synthetic head bob, dramatic roll, fake handheld wobble, or strong motion blur.
- No visible flat-screen body/hands.

## Materials Bible

### Terrain
Physical rock/soil/root/organic response with visible roughness separation, normal detail, restrained moisture variation, and no obvious repeating tile signature.

### Architecture / personalized life objects
Real material logic first. Do not use generic glowing sci-fi blocks to stand in for meaning. Provenance state controls whether an object may imply autobiographical fidelity.

### Orb
Authored non-primitive silhouette and internal structure. No generic glass sphere, magic ball, support rod, pedestal, or portal identity. Geometry must survive with bloom disabled.

### Passport
Durable ownership artifact; dark, tactile, legible, restrained emissive behavior. Interaction clarity over spectacle.

### Earth
Physically plausible Earth first; aggregate field is a truthful overlay. No NASA-photo pasted sphere as finished art and no abstract mood ball replacing Earth identity.

### Contextual UI
World-preserving, high-contrast, dismissible surfaces. Never a permanent HUD or full-screen dashboard by default.

## Lighting Bible

### Canonical daylight
Natural/atmospheric world light dominates. Preserve material response, contact shadow, and silhouette. Orb light is secondary.

### Evening/night
Maintain path/terrain/architecture readability. Do not default to blue-purple cyberpunk.

### Emotional-weather state
Modify atmosphere/light/state without replacing geography.

### Reduced stimulation
Keep semantic hierarchy and legibility while reducing macro transients, particles, contrast fluctuation, and Orb motion intensity.

Bloom must never erase geometry; volumetrics establish depth rather than hide placeholder art.

## Environmental life

Idle Home must remain alive through asynchronous, low-amplitude systems:

- slow environmental/vegetation motion;
- atmospheric drift with low particle density;
- slow Sky/cloud evolution;
- restrained lighting evolution;
- Orb procedural life;
- truthful Earth evolution only when governed aggregate data exists;
- source-backed distant life-domain activity only when authorized.

Repeated/synchronized particle scatter is a defect. Stillness must remain compelling without spectacle.

## Personalization model

### Fixed UrAi language

- Home state machine and spatial grammar;
- Orb identity/state semantics;
- broad Sky → Life Map ownership;
- terrain → Ground ownership;
- camera/bodyless flat-screen FP contract;
- Passport ownership semantics;
- material/lighting restraint;
- truth/provenance grammar.

### Personalized

Only source-backed/permitted content may represent:

- residence/home;
- work/purpose;
- meaningful places;
- routes/routines;
- selected personal objects;
- relationship/place connections.

### State-derived

- time;
- environmental/weather state;
- Personal Emotional Weather where supported;
- memory/system signal state;
- Global Emotional Field only when safely published aggregate exists.

## Contextual UI

Default FP Home is world-first with minimal permanent UI.

Critical access cannot depend on hover. Desktop, keyboard, touch, screen reader, visible focus, high zoom, and mobile safe-area containment must all remain valid. Current touch controls require 48 px-class containment where used.

## Accessibility variants

### Reduced motion
- Reduced motion preserves the same semantic hierarchy: `HOME_PRESENTATION` → Avatar activation → bodyless `AVATAR_HOME_FIRST_PERSON`, with a shortened/non-aggressive embodiment transition.
- Suppress macro Orb/environment transients while preserving semantic state.
- No aggressive camera parallax, blur, or surprise motion.

### Reduced stimulation
- lower particle density;
- lower contrast fluctuation;
- calmer secondary motion;
- preserve world hierarchy and destination cues.

### High clarity / low vision
- stronger object/path separation;
- visible focus and interaction state;
- no raw-coordinate dependence for orientation guidance.

### Audio access
- captions/speaker identity and non-audio warning equivalents are required;
- Orb visual speaking must track real audio rather than substitute fake activity.

## Failure gallery — reject on sight

1. Excessive bloom that erases Orb/terrain geometry.
2. Particle fog used as visual richness.
3. Generic fantasy valley unrelated to current Home geography.
4. Empty grass plane or circular platform.
5. Flat-screen FPS hands/body rig.
6. Shooter/game HUD.
7. Orb scaled into a giant cosmic object.
8. Cartoon/mood-ring Orb.
9. Primitive/low-poly hero environment.
10. Random architecture without provenance semantics.
11. Purple/cyan gamer-sci-fi wash.
12. Portrait-photography DOF during ordinary exploration.
13. Strong camera motion blur.
14. Generic pasted Earth presented as finished Global Emotional Field.
15. Full-screen dashboard replacing Home.
16. Cross-frame geography drift.
17. Obvious asset-pack collage.
18. Unverified personal structures presented as factual autobiography.
19. Localized portal/ring for Sky ascent.
20. Glowing doorway/hole/radial tunnel for Ground descent.

## Literal-pixel acceptance matrix

Every candidate reference/runtime capture records at minimum:

- canonical VGM ID;
- candidate asset ID;
- exact repository/branch/SHA;
- camera state/FOV/device orientation;
- Home stable/transition state;
- Orb state;
- time/lighting/weather state;
- UI state;
- accessibility state;
- dimensions/device class;
- source paths/runtime route;
- provenance/truth class;
- literal human inspection decision;
- reviewer/scope when required;
- supersedes/superseded-by;
- merge/deploy/live status.

A visually attractive frame does not pass if geography, truth semantics, accessibility, or source continuity are wrong.

## Implementation handoff

Primary current implementation surfaces include:

- `urai-tier1/src/spatial/layout/HomeWorldProductionV223.tsx` — Home runtime, FP camera, Orb, state motion, movement, transitions.
- `urai-tier1/src/spatial/layout/HomeWorldProductionV223Geometry.tsx` — sculpted Home terrain/path/strata/grove geometry.
- `urai-tier1/src/spatial/home/homeExperienceState.ts` — stable/transition states, return stack, origin snapshots.
- `urai-tier1/src/spatial/home/useHomeExperienceController.ts` — semantic activation, origin capture/restore, destination commit.
- `urai-tier1/src/spatial/home/HomeEmbodiedAvatar.tsx` — current governed Home presentation Avatar and activation anchor; hidden in bodyless first-person Home.
- `urai-tier1/src/spatial/layout/HomeAAAVisualRepair.tsx` — current first-person Passport candidate.
- `docs/URAI_VISUAL_GOLD_MASTER_MANIFEST_V1.md` — visual/release control plane.
- `docs/URAI_VISUAL_SYSTEM_BIBLES_V1.md` — cross-system camera/material/light/motion/accessibility grammar.

Do not introduce a second Home runtime merely to match reference art. Converge the reference target into the current owner.

## Performance/degradation

Use current adaptive quality paths and preserve semantic identity under degradation.

Current Orb procedural budgets are already tiered:

- low: 120 motes / 2 filaments / 32 membrane segments;
- medium: 180 motes / 5 filaments / 48 membrane segments;
- high: 520 motes / 8 filaments / 64 membrane segments.

Reduced-motion/constrained rendering may lower cadence and macro motion. Degradation may reduce density/quality, but may not introduce fake UI, remove destination meaning, or convert uncertainty into false certainty.

## Gold-Master decision

**NO-GO / NOT GOLD MASTER.**

Current Avatar-presentation → bodyless-first-person Home, Orb, Sky, Ground transition ownership, physical Passport, and fail-closed Global Emotional Field Earth are source/runtime candidates, but literal current-head pixels and inspection remain required. Personal Emotional Weather has a current state model and source-converged binding into the active canonical Home atmosphere, but its fresh exact-head responsive/reduced-state literal visual acceptance remains open. Any separately governed likeness/self-view/XR component remains outside ordinary non-XR Home authority and must satisfy its own recorded source/consent/provenance boundary.

This document is complete as a **candidate reference contract**. It becomes visual authority only through the governing VGM manifest, exact-head runtime proof, literal-pixel acceptance, accessibility/performance/privacy/security acceptance, required independent review/governance, protected merge/deploy, deployed-SHA readback, live verification, and rollback/recovery evidence.
