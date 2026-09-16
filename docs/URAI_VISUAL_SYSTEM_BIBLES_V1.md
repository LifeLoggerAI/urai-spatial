# URAI Visual System Bibles V1

Authority date: 2026-09-16
Status: CURRENT SYSTEM-WIDE VISUAL SPECIFICATION / REQUIRES RUNTIME PIXEL PROOF

This file locks cross-world visual rules that implementation and reference generation must share. Values already governed in current source are repeated here as authority pointers; unresolved values remain explicitly unresolved rather than guessed.

## Camera

### Home first person
- 58° landscape FOV.
- 66° portrait FOV.
- Camera-only non-XR embodiment.
- No synthetic head bob.
- World movement pauses when modal/conversation ownership requires it; return restores recorded origin.

### Ground
- 1.69 m target eye height on current Ground authority.
- 58° landscape FOV.
- 66° portrait FOV.
- Terrain-following camera without authored head bob.
- No pointer-lock shooter presentation.

### Life Map
- Camera movement must reveal real depth/parallax rather than UI scaling, radial tunnel, or teleport spectacle.
- Portrait must be compositionally authored rather than cropped desktop.

### Focus
- Camera places one selected-memory manifestation primary; related context remains secondary.
- Entry and Replay departure preserve selected-memory identity and spatial continuity.

### Replay
- First-person witness camera; no floating non-XR body/hands.
- Evidence/media presentation may occupy the spatial world without replacing the world with a flat player.

### Reduced motion
- Preserve semantic transition order and destination ownership.
- Replace large camera travel with bounded minimal travel/crossfade only where needed for accessibility; never skip truth/permission state.

## Scale

All production references must include human-relative scale rather than isolated product renders.

Required locked comparisons:
- Avatar ↔ Orb ↔ Home terrain.
- Avatar eye height ↔ Ground arrival.
- FP Home camera ↔ Passport physical artifact.
- FP Home camera ↔ Global Emotional Field Earth.
- Memory Star far/mid/near ↔ Focus manifestation.
- Mirror primary structure ↔ human camera.

Numeric scale not already governed by current source remains REQUIRED-TO-MEASURE-FROM-CURRENT-RUNTIME; do not invent values here.

## Materials

### Avatar
- Governed current digital-human asset/material authority; no wax/plastic game-character finish.
- Skin/clothing response must remain coherent under Home lighting.

### Orb
- Authored non-primitive silhouette.
- Material must preserve current authored membrane/core/stabilizer structure where still present on the live asset.
- No generic glass sphere, magic-ball, pedestal, support rod, or portal identity.

### Ground
- Near field must read as physical soil/rock/root/moisture/debris rather than flat procedural noise.
- Vegetation must not ship as obvious cylinder/sphere primitives.
- Urban architecture must not ship as repeated extruded boxes.
- Coastal water must not ship as a flat blue plane.

### Memory Star / Focus
- Memory Star can read luminous at distance but close form must be authored and non-collectible.
- Focus must avoid slab/card/crystal-pickup grammar; current V272 fold remains candidate only until pixels pass.

### Passport
- Physical object should read as durable ownership/authority artifact, not floating dashboard or portal.

### Global Emotional Field Earth
- Must be physically plausible Earth authority, not a generic blue sphere.
- Emotional aggregate visualization is an overlay/state of safe published data, never the underlying Earth identity.

### Scenario World
- Spatially rich but visibly non-factual; material language must help distinguish scenario from Replay without turning it into generic neon sci-fi.

## Lighting

Global rules:
- Preserve readable material response and silhouette before bloom.
- Bloom may accent emissive energy; it must not erase geometry.
- Fog/volumetrics establish depth, not hide placeholder art.
- Avoid clipped highlights and overexposed cyan/white objects.
- Mobile exposure/composition must be inspected separately.

World intent:
- Home: grounded cinematic natural/atmospheric light with Orb contribution subordinate to world light.
- Ground: physical environmental light that supports believable terrain and place reconstruction.
- Life Map: deep layered cosmic contrast with readable geography and selected identity.
- Focus: intimate selected-memory illumination with dimensional form and restrained emissive response.
- Replay: evidence-aware cinematic light; unresolved/source-absent state must not imply false photographic certainty.
- Mirror: dedicated reflective/quiet lighting identity; re-audit against current runtime before freezing numeric settings.
- Passport: legible ownership/privacy surface; avoid spectacle that obscures controls.
- Earth: physically plausible globe lighting plus truthful data-state overlay.
- Possible Futures: distinguish scenario state without visualizing prediction certainty.

## Motion

### Avatar
- Authored idle_breath where current asset supports it.
- Reduced motion settles to stillness without removing embodiment semantics.
- Avatar activation is acknowledgement + camera-to-eye embodiment, not profile-menu navigation.

### Orb
- Persistent life can be procedural.
- State entry clips are bounded/one-shot where current authority specifies.
- Audible speaking motion begins only after actual audio/device speech starts.
- Cancel/barge-in collapses speaking energy immediately.
- Reduced motion preserves semantic light/state and suppresses macro transient motion.

### Environment
- Wind, weather, particles, stars, and ambient drift must be slow enough to read as world life, not particle soup.
- Repetition and synchronized scatter are visual defects.

### Transitions
- Home → Life Map: broad-sky ascent.
- Home → Ground: physical terrain/material crossing.
- Life Map → Focus: selected-memory approach through actual depth/parallax.
- Focus → Replay: memory-owned transition; no generic radial tunnel.
- Back/Escape: one semantic/spatial layer at a time with origin restoration.

## Audio / haptics

Current known authority:
- Ground has governed ambient audio but still carries explicit gaps for descent, footsteps, biome layers, and memory spatial audio.
- Orb acoustic visuals bind to actual playback timing; text-only cannot fake speech.

Required cue families:
- semantic activation;
- confirmation;
- privacy/consent change;
- warning/error;
- material crossing;
- arrival;
- Orb response/listening/speaking/cancel;
- Replay source media and environment;
- Mirror dedicated ambience;
- Passport ownership/privacy cues;
- Earth unavailable/suppressed/aggregate cues;
- Possible Futures scenario-entry/branch/return cues.

Haptics must be semantic and sparse. Walking must not buzz continuously. Reduced-intensity mode must preserve meaning.

## Accessibility visual authority

Every major realm must prove:
- keyboard-only reachability and visible focus for semantic controls;
- screen-reader names/state announcements;
- reduced motion;
- reduced stimulation where applicable;
- mobile 48 px-class control containment where current runtime uses touch controls;
- captions/speaker identity for audible conversational content;
- non-audio equivalents for warnings and state changes;
- blind/low-vision directional/environment guidance without raw coordinate dumping;
- high zoom/responsive containment.

## Device authority

### Desktop
Primary cinematic composition; must not depend on hover-only access.

### Mobile portrait
Independent composition and safe-area/touch layout. Do not use a vertical crop of desktop as final authority.

### Tablet
Create separate references only where layout/camera materially differs.

### XR
Future/separate embodiment. Tracked hands/controllers may appear only when legitimate device tracking exists. XR concepts cannot authorize hands in ordinary desktop/mobile FPV.

## Truth/provenance visual grammar

Personalized Lived World:
- confirmed = source-backed and permitted;
- partial = known features with visibly bounded unknowns;
- unknown = no autobiographical claim.

Replay:
- captured/recorded;
- supported reconstruction/context;
- interpretation/possible pattern;
- unknown/unresolved.

Possible Futures:
- always scenario, not memory;
- assumptions and uncertainty visible;
- branches unranked;
- provider unavailable does not fabricate output.

Global Emotional Field:
- unavailable;
- suppressed;
- safe aggregate only when actually published.

No visual style may convert uncertainty into certainty merely because a polished render looks convincing.
