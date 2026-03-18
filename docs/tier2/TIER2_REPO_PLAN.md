# URAI-Spatial — Tier 2 Repo Plan
## Embodied World Lock

Status: ACTIVE  
Tier objective: make URAI-Spatial feel inhabited, anchored, emotionally coherent, and visually final.

## Freeze rules

- No Tier 3+ expansion work inside this tier
- No XR/VR additions inside this tier
- No placeholder-grade body/orb/ground behavior may survive a lock
- No polish-first shortcuts
- No parallel lock claims without archived evidence
- No uncontrolled growth inside `src/spatial/scene/SpatialScene.tsx`

---

## Canonical repo targets

### Existing core targets
- `src/app/page.tsx`
- `src/spatial/scene/SpatialScene.tsx`
- `src/spatial/data/stars.ts`
- Canonical store file:
  - `src/spatial/state/sceneStore.ts`
  - or `src/spatial/state/useSceneStore.ts`

### Tier 2 module targets
- `src/spatial/layout/spatialLayout.ts`
- `src/spatial/camera/spatialCameraPresets.ts`
- `src/spatial/world/GroundLayer.tsx`
- `src/spatial/world/AtmosphereLayer.tsx`
- `src/spatial/world/EnvironmentMotionLayer.tsx`
- `src/spatial/entities/OrbPresence.tsx`
- `src/spatial/entities/BodyPresence.tsx`
- `src/spatial/transitions/spatialTransitionRules.ts`
- `src/spatial/theme/spatialVisualTokens.ts`
- `src/spatial/theme/spatialStateTints.ts`
- `src/spatial/theme/spatialLighting.ts`

---

## Global verify views

- View A: app load, Home default
- View B: Home with slow camera drift
- View C: world/spatial default
- View D: world wide frame
- View E: memory-adjacent / LifeMap approach
- View F: Home → world transition
- View G: world → memory approach

---

## Global artifact rule

Archive all phase evidence under:

`_audit/tier2/phaseXX-<slug>/<timestamp>/`

Minimum artifacts per phase:
- `verify-notes.md`
- `before-home.png`
- `after-home.png`
- `before-world.png`
- `after-world.png`

Add motion clips and performance notes where applicable.

---

# Phase board

---

## Phase 1 — Establish Tier 2 baseline truth

**Objective**  
Freeze current repo and visual truth before making Tier 2 changes.

**Repo targets**
- `docs/tier2/TIER2_EXECUTION_BOARD.md`
- `_audit/tier2/phase01-baseline-truth/<timestamp>/...`

**Edit tasks**
- [ ] Create `docs/tier2/`
- [ ] Create `docs/tier2/TIER2_EXECUTION_BOARD.md`
- [ ] Write down canonical surviving files
- [ ] Record whether store source-of-truth is `sceneStore.ts` or `useSceneStore.ts`
- [ ] List placeholder-grade body/orb/ground/lighting/motion issues
- [ ] Archive baseline stills and motion captures

**Verify views**
- [ ] A
- [ ] B
- [ ] C
- [ ] E
- [ ] F

**Artifacts**
- [ ] `repo-truth.md`
- [ ] `placeholder-inventory.md`
- [ ] baseline stills
- [ ] baseline motion captures

**Fail if**
- [ ] canonical store file is still ambiguous
- [ ] current visual breakpoints are not documented
- [ ] no baseline evidence exists

**Lock when**
- [ ] repo truth is explicit
- [ ] baseline captures are archived
- [ ] current placeholders are enumerated

---

## Phase 2 — Build canonical ground geometry

**Objective**  
Create the actual world floor layer.

**Repo targets**
- `src/spatial/layout/spatialLayout.ts`
- `src/spatial/world/GroundLayer.tsx`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Create `src/spatial/layout/spatialLayout.ts`
- [ ] Create `src/spatial/world/GroundLayer.tsx`
- [ ] Move ground size/height/depth constants into `spatialLayout.ts`
- [ ] Render `GroundLayer` from `SpatialScene.tsx`
- [ ] Remove any ad hoc inline ground fragments
- [ ] Keep ground material restrained and low-noise

**Verify views**
- [ ] A
- [ ] B
- [ ] C
- [ ] D

**Artifacts**
- [ ] `ground-before-after.md`
- [ ] home still after ground pass
- [ ] world still after ground pass
- [ ] slow drift capture proving floor presence

**Fail if**
- [ ] ground reads like a patch or plate
- [ ] body still appears suspended
- [ ] ground scale feels arbitrary

**Lock when**
- [ ] scene has a stable world base
- [ ] body no longer reads as floating solely because of missing floor

---

## Phase 3 — Sky-to-ground fusion pass

**Objective**  
Fuse sky and ground into one environment.

**Repo targets**
- `src/spatial/world/AtmosphereLayer.tsx`
- `src/spatial/layout/spatialLayout.ts`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Create `src/spatial/world/AtmosphereLayer.tsx`
- [ ] Centralize horizon distance and atmospheric blend settings
- [ ] Add restrained haze/falloff/fog logic if needed
- [ ] Remove accidental seam between sky and terrain
- [ ] Mount `AtmosphereLayer` from `SpatialScene.tsx`

**Verify views**
- [ ] B
- [ ] C
- [ ] D

**Artifacts**
- [ ] `horizon-check.png`
- [ ] wide-frame capture
- [ ] `verify-notes.md`

**Fail if**
- [ ] horizon feels arbitrary
- [ ] hard seam remains visible
- [ ] sky and terrain still feel composited

**Lock when**
- [ ] sky and ground read as one authored environment

---

## Phase 4 — Body-to-ground anchoring pass

**Objective**  
Make the figure physically belong to the world.

**Repo targets**
- `src/spatial/entities/BodyPresence.tsx`
- `src/spatial/layout/spatialLayout.ts`
- `src/spatial/scene/SpatialScene.tsx`
- Home embodiment import chain from `src/app/page.tsx`

**Edit tasks**
- [ ] Create `BodyPresence.tsx` if missing
- [ ] Move body anchor position/scale constants into `spatialLayout.ts`
- [ ] Use one canonical body render path
- [ ] Correct body placement relative to ground
- [ ] Normalize camera distance against body scale
- [ ] Remove hover-looking placement

**Verify views**
- [ ] A
- [ ] B
- [ ] C
- [ ] F

**Artifacts**
- [ ] `body-anchor-notes.md`
- [ ] Home still
- [ ] world still
- [ ] Home→world clip

**Fail if**
- [ ] body still looks detached
- [ ] scale mismatch remains
- [ ] contact with world is visually weak

**Lock when**
- [ ] body convincingly inhabits the world

---

## Phase 5 — Orb canonical placement pass

**Objective**  
Give the orb one intentional spatial role.

**Repo targets**
- `src/spatial/entities/OrbPresence.tsx`
- `src/spatial/layout/spatialLayout.ts`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Create `OrbPresence.tsx`
- [ ] Move orb anchor offsets and rest zone into `spatialLayout.ts`
- [ ] Render orb only through `OrbPresence.tsx`
- [ ] Remove scattered orb positioning logic
- [ ] Lock relative placement to body/camera/world

**Verify views**
- [ ] A
- [ ] C
- [ ] D
- [ ] F

**Artifacts**
- [ ] `orb-placement-home.png`
- [ ] `orb-placement-world.png`
- [ ] `placement-rules.md`

**Fail if**
- [ ] orb drifts without rule
- [ ] orb crowds the body
- [ ] orb placement changes arbitrarily by view

**Lock when**
- [ ] orb has one stable canonical home

---

## Phase 6 — Orb idle behavior canon pass

**Objective**  
Make the orb feel alive at rest.

**Repo targets**
- `src/spatial/entities/OrbPresence.tsx`
- optional `src/spatial/transitions/orbMotion.ts`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Implement idle breathing rhythm
- [ ] Implement glow floor/ceiling
- [ ] Implement minimal pulse logic
- [ ] Cap amplitude and brightness swing
- [ ] Preserve stillness between motion beats

**Verify views**
- [ ] A
- [ ] B
- [ ] C

**Artifacts**
- [ ] idle capture
- [ ] `orb-idle-rules.md`

**Fail if**
- [ ] orb reads as flashy
- [ ] pulse is noisy
- [ ] motion feels game-like

**Lock when**
- [ ] orb feels alive but restrained

---

## Phase 7 — Orb state-linked behavior pass

**Objective**  
Make orb behavior meaningful, not random.

**Repo targets**
- canonical store file
- `src/spatial/entities/OrbPresence.tsx`
- `src/spatial/transitions/spatialTransitionRules.ts`

**Edit tasks**
- [ ] Define small canonical orb state set
- [ ] Map state to restrained glow/pulse/motion changes
- [ ] Keep base orb identity stable across states
- [ ] Drive state from one canonical source

**Verify views**
- [ ] A
- [ ] C
- [ ] E
- [ ] F

**Artifacts**
- [ ] state comparison capture
- [ ] `orb-state-mapping.md`

**Fail if**
- [ ] state changes feel random
- [ ] orb becomes overexpressive
- [ ] identity changes too much between states

**Lock when**
- [ ] orb changes meaningfully without losing itself

---

## Phase 8 — Body silhouette finalization pass

**Objective**  
Replace placeholder-grade embodiment with the canonical URAI figure.

**Repo targets**
- `src/spatial/entities/BodyPresence.tsx`
- Home embodiment path from `src/app/page.tsx`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Finalize silhouette/body treatment
- [ ] Remove temporary body mesh logic
- [ ] Remove inconsistent body render branches
- [ ] Keep body language aligned with URAI scene tone

**Verify views**
- [ ] A
- [ ] C
- [ ] F

**Artifacts**
- [ ] `body-home-final.png`
- [ ] `body-world-final.png`
- [ ] `placeholder-purge.md`

**Fail if**
- [ ] body still reads as temp art
- [ ] body clashes with world style
- [ ] body remains uncanny or generic

**Lock when**
- [ ] body reads as intentional URAI presence

---

## Phase 9 — Home-to-world body continuity pass

**Objective**  
Make embodiment coherent across Home and world.

**Repo targets**
- `src/spatial/entities/BodyPresence.tsx`
- `src/spatial/layout/spatialLayout.ts`
- `src/spatial/camera/spatialCameraPresets.ts`
- `src/app/page.tsx`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Create `spatialCameraPresets.ts`
- [ ] Normalize body scale ratios across Home/world
- [ ] Normalize body framing across Home/world
- [ ] Remove scene-specific body scaling hacks
- [ ] Define Home/world embodiment continuity rules

**Verify views**
- [ ] A
- [ ] C
- [ ] F

**Artifacts**
- [ ] Home/world side-by-side sheet
- [ ] Home→world continuity clip
- [ ] `continuity-checklist.md`

**Fail if**
- [ ] Home self and world self feel different
- [ ] scale changes noticeably
- [ ] transition breaks embodiment continuity

**Lock when**
- [ ] same self is visibly present across both modes

---

## Phase 10 — Primary composition grammar pass

**Objective**  
Define the canonical layout of body, orb, ground, sky, and far-field memory space.

**Repo targets**
- `src/spatial/layout/spatialLayout.ts`
- `src/spatial/camera/spatialCameraPresets.ts`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Define presets for Home, world default, world wide, memory-adjacent
- [ ] Centralize focal hierarchy rules
- [ ] Remove freehand camera tweaks from unrelated code
- [ ] Lock canonical spacing relationships

**Verify views**
- [ ] A
- [ ] C
- [ ] D
- [ ] E

**Artifacts**
- [ ] four-view composition sheet
- [ ] `camera-preset-notes.md`

**Fail if**
- [ ] scene balance changes arbitrarily
- [ ] elements fight for attention
- [ ] views feel authored by different systems

**Lock when**
- [ ] primary scenes obey one composition language

---

## Phase 11 — Transition grammar pass

**Objective**  
Make transitions feel like reveals within one world.

**Repo targets**
- `src/spatial/transitions/spatialTransitionRules.ts`
- `src/spatial/camera/spatialCameraPresets.ts`
- `src/spatial/scene/SpatialScene.tsx`
- canonical store file

**Edit tasks**
- [ ] Create `spatialTransitionRules.ts`
- [ ] Centralize timing/easing/reveal order
- [ ] Define Home→world transition grammar
- [ ] Define world→memory approach grammar
- [ ] Remove route-jump feel and stitched swaps

**Verify views**
- [ ] F
- [ ] G
- [ ] full A→F→E cold-open flow

**Artifacts**
- [ ] transition clips
- [ ] `transition-grammar.md`

**Fail if**
- [ ] movement feels mechanical
- [ ] continuity breaks mid-transition
- [ ] app still feels stitched together

**Lock when**
- [ ] transitions feel like reveals inside one world

---

## Phase 12 — Environmental motion foundation pass

**Objective**  
Add ambient life without noise.

**Repo targets**
- `src/spatial/world/EnvironmentMotionLayer.tsx`
- `src/spatial/world/AtmosphereLayer.tsx`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Create `EnvironmentMotionLayer.tsx`
- [ ] Add minimal cloud drift if needed
- [ ] Add minimal atmosphere drift if needed
- [ ] Add aura presence only if it helps
- [ ] Add particles only if required
- [ ] Keep motion layers separate from orb/body logic

**Verify views**
- [ ] B
- [ ] C
- [ ] D

**Artifacts**
- [ ] ambient motion capture
- [ ] `motion-layer-inventory.md`

**Fail if**
- [ ] world becomes busy
- [ ] particles steal focus
- [ ] motion feels decorative

**Lock when**
- [ ] environment feels alive, not noisy

---

## Phase 13 — Environmental restraint and performance pass

**Objective**  
Make ambient motion serene and technically safe.

**Repo targets**
- `src/spatial/world/EnvironmentMotionLayer.tsx`
- optional `src/spatial/world/spatialMotionBudget.ts`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Add explicit motion ceilings
- [ ] Define scene rest state
- [ ] Cap counts, amplitudes, opacity swings, drift speeds
- [ ] Remove any ambient layer that breaks calm
- [ ] Profile frame pacing during long observation

**Verify views**
- [ ] B
- [ ] C
- [ ] D over long observation

**Artifacts**
- [ ] 15–20 second observation clip
- [ ] `perf-notes.txt`
- [ ] `motion-budget.md`

**Fail if**
- [ ] scene chatters
- [ ] ambient systems dominate the eye
- [ ] frame pacing becomes unstable

**Lock when**
- [ ] ambient motion remains calm and stable over time

---

## Phase 14 — Canonical color system pass

**Objective**  
Establish the base embodied-world palette.

**Repo targets**
- `src/spatial/theme/spatialVisualTokens.ts`
- `src/spatial/world/GroundLayer.tsx`
- `src/spatial/world/AtmosphereLayer.tsx`
- `src/spatial/entities/OrbPresence.tsx`
- `src/spatial/entities/BodyPresence.tsx`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Create `spatialVisualTokens.ts`
- [ ] Define shared tokens for sky/ground/orb/body/aura/memory accents
- [ ] Refactor hardcoded color literals into tokens
- [ ] Align contrast hierarchy across components

**Verify views**
- [ ] A
- [ ] C
- [ ] D
- [ ] E

**Artifacts**
- [ ] palette sheet
- [ ] before/after side-by-side
- [ ] `hardcoded-color-removal.md`

**Fail if**
- [ ] colors remain scattered literals
- [ ] palette drifts by component
- [ ] contrast hierarchy is inconsistent

**Lock when**
- [ ] one base palette system governs the world

---

## Phase 15 — Emotional tint system pass

**Objective**  
Allow emotion to shift tone without breaking identity.

**Repo targets**
- `src/spatial/theme/spatialStateTints.ts`
- canonical store file
- `src/spatial/entities/OrbPresence.tsx`
- `src/spatial/world/AtmosphereLayer.tsx`
- `src/spatial/scene/SpatialScene.tsx`

**Edit tasks**
- [ ] Create `spatialStateTints.ts`
- [ ] Define controlled tint mappings for canonical state set
- [ ] Preserve base palette and modulate only
- [ ] Drive tint from one store property
- [ ] Remove scattered emotional color logic

**Verify views**
- [ ] A
- [ ] C
- [ ] E
- [ ] F in at least 3 states

**Artifacts**
- [ ] state comparison sheet
- [ ] `emotional-tint-mapping.md`

**Fail if**
- [ ] moods look like different apps
- [ ] tint overrides the base palette
- [ ] emotional variation feels gimmicky

**Lock when**
- [ ] emotional tone shifts without identity break

---

## Phase 16 — Lighting consistency pass

**Objective**  
Make all major scenes obey one lighting language.

**Repo targets**
- `src/spatial/theme/spatialLighting.ts`
- `src/spatial/scene/SpatialScene.tsx`
- `src/spatial/entities/OrbPresence.tsx`
- `src/spatial/world/GroundLayer.tsx`
- `src/spatial/world/AtmosphereLayer.tsx`

**Edit tasks**
- [ ] Create `spatialLighting.ts`
- [ ] Define key/fill/orb interaction/depth logic
- [ ] Remove ad hoc light tweaks from components
- [ ] Normalize Home/world/memory-adjacent lighting

**Verify views**
- [ ] A
- [ ] C
- [ ] D
- [ ] E

**Artifacts**
- [ ] lighting comparison sheet
- [ ] `lighting-consistency.md`

**Fail if**
- [ ] scenes feel lit by different systems
- [ ] orb/body/ground react inconsistently
- [ ] some views remain prototype-lit

**Lock when**
- [ ] primary scenes obey one premium lighting language

---

## Phase 17 — Side-by-side frame audit pass

**Objective**  
Prove the product is one visual system.

**Repo targets**
- `docs/tier2/TIER2_FRAME_AUDIT.md`
- `_audit/tier2/phase17-frame-audit/<timestamp>/...`

**Edit tasks**
- [ ] Capture final canonical frame set
- [ ] Capture final motion set
- [ ] Lay out Home/world/wide/transition/memory-adjacent side by side
- [ ] Write findings and any regressions

**Verify views**
- [ ] A
- [ ] C
- [ ] D
- [ ] E
- [ ] F
- [ ] G

**Artifacts**
- [ ] final frame sheet
- [ ] final motion sheet
- [ ] `audit-findings.md`

**Fail if**
- [ ] any one scene collapses into prototype quality beside the others
- [ ] motion reveals instability hidden by stills

**Lock when**
- [ ] full set reads as one premium system

---

## Phase 18 — Tier 2 final lock pass

**Objective**  
Declare Embodied World Lock only after full gate review.

**Repo targets**
- `docs/tier2/TIER2_LOCK_REPORT.md`
- `_audit/tier2/phase18-final-lock/<timestamp>/...`

**Edit tasks**
- [ ] Run Static Frame Gate
- [ ] Run Motion Gate
- [ ] Run Emotional Coherence Gate
- [ ] Run Placeholder Purge Gate
- [ ] Run Serenity Gate
- [ ] Run Identity Gate
- [ ] Write pass/fail result for each gate
- [ ] Reopen only owning phase for any failed gate

**Verify views**
- [ ] full A→F→E cold-open
- [ ] idle observation on A/C/D

**Artifacts**
- [ ] `gate-results.md`
- [ ] `tier2-pass-sentence.md`
- [ ] final still set
- [ ] final motion set

**Fail if**
- [ ] any placeholder remains
- [ ] any gate fails
- [ ] any scene still feels stitched
- [ ] motion/lighting/emotion breaks identity

**Lock when**
- [ ] all gates pass
- [ ] final statement is true:

> URAI-Spatial feels like an inhabited, premium, emotionally coherent world where self, memory, orb, sky, and ground all belong to one visual language.

---

# Phase status template

Use this for every phase.

## Phase XX — <title>

Owner:  
Repo targets:  
Status: Not started / Building / Verify / Failed / Fixing / Locked

Build complete:  
Verify complete:  
Fail findings:  
Fix applied:  
Artifacts archived:  
Pass sentence:  
Next allowed action:

---

# Tier 2 completion rule

Tier 2 is not complete because one shot looks good.  
Tier 2 is complete only when:

- ground anchors the world
- orb has canonical life behavior
- body has canonical presence
- composition is unified
- environment is alive but calm
- polish is consistent and premium
- the final gate set passes in stills and motion