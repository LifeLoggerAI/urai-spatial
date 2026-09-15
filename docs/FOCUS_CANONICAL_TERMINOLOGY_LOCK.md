# URAI Focus — Canonical Terminology & Experience Lock

Authority date: 2026-09-15
Governing repository: `LifeLoggerAI/urai-spatial`
Canonical route: `/focus`
Companion branch root: `3b1ec817c82195a7e3d9fb4b2a3dec6a6265083d`
Status: terminology and experience contract; does not by itself authorize merge, deployment, visual acceptance, or release.

## Authority rule

Current live repository/runtime authority governs implementation. Google Drive specifications remain supporting design or historical evidence unless they agree with current source. The older Drive `focus.txt` productivity-session concept is explicitly non-governing for the current `/focus` route.

## Canonical product hierarchy

`UrAi -> Life Map -> Memory Star / selected memory -> Focus -> Replay`

Canonical spatial journey:

`Home -> Ascent -> Life Map -> selected memory -> Focus -> Replay -> Return to Focus -> Return to Life Map -> Home`

Focus is not an unrelated productivity page or standalone session tool. It is the close-range selected-memory experience reached from Life Map. Replay moves deeper into that same selected memory.

## Public/product vocabulary

Use these names in user-facing product copy where applicable:

- UrAi
- Life Map
- Memory Star
- Selected Memory
- Focus
- Explore
- Related Context
- Close Inspection
- Enter Replay
- Replay
- Return to Focus
- Return to Life Map
- Recenter
- Emotional Weather

`Focus Observatory` is reserved for safe neutral direct entry when `/focus` has no authorized selected memory. It is not a synonym for selected-memory Focus.

## Rendering and visual-design vocabulary

The close-range memory reveal is described perceptually as:

`Distant Memory Star -> Star Aura -> Memory Boundary -> Memory Interior -> Memory Reveal -> Focus Arrival -> Focus`

These are perceptual layers, not a requirement to construct nested spheres or duplicate runtime states.

- **Distant Memory Star** — memory identity seen at Life Map scale.
- **Star Aura** — local light, particles, atmospheric influence, and contextual response that becomes visible during approach.
- **Memory Boundary** — the dimensional edge that resolves at close range. Prefer this over a new public `Memory Shell` noun.
- **Memory Interior** — contextual/media/emotional volumetric evidence inside the selected memory representation.
- **Memory Reveal** — the point where recognizable aspects of the remembered moment emerge.
- **Focus Arrival** — the camera settles into the close-range selected-memory composition.

## Engineering vocabulary that may remain internal

Stable implementation identifiers may remain when renaming would create churn without product benefit, including:

- `LifeMapNode`
- `SelectedMemory`
- `FocusChamberClient`
- `MemoryAperture`
- `cameraCheckpoint`
- `entryPortal`
- `manifestId`
- `memoryId`
- `starId`
- `nodeId`
- existing governed asset filenames such as `focus-memory-chamber-v1.glb`

Internal `portal` or `aperture` metadata does not authorize a visible portal, wormhole, ring gate, or hyperspace tunnel.

## Historical/non-governing public vocabulary

Do not reintroduce these as the current Focus product model:

- Deep Focus
- Focus Session
- Deep Work
- Focus Session Mode
- mission cockpit
- productivity chamber
- Replay Theater
- Memory Shell as a newly locked product layer
- Memory Core as a newly locked product layer
- Replay Threshold as a formal stage
- visible Focus portal
- visible Replay portal

The old productivity-focused Drive specification may remain preserved for provenance or a future separate product, but it must not override this route.

## Life Map node vs Memory Star

`LifeMapNode` is the generic graph entity. Current node types may include memory, season, ritual, forecast, threshold, relationship, recovery, and legacy. Do not describe every Life Map node as a memory.

A **Memory Star** is the canonical Life Map-scale identity of a memory. Its far-distance presentation may read as a luminous point while close-range rendering resolves into more authored, irregular, material, and volumetric structure. It does not need to be a literal glowing sphere.

Use **Related Context** for the generic local graph around Focus. Use **Related Memories** only when the neighboring entities are actually memories.

## Life Map -> Focus choreography

Preserve the existing Life Map runtime phases where they remain authoritative:

`overview -> departure -> travel -> approach -> arrival`

Do not create a second engineering state machine merely to name cinematic sub-beats. The following are visual choreography within the existing journey:

1. Memory Attention
2. Memory Selection
3. Selection acknowledgement
4. Target acquisition
5. Departure
6. Initial Pull
7. Travel
8. Acceleration
9. Approach
10. Memory Star Resolves
11. Memory Reveal
12. Deceleration
13. Focus Arrival

Travel must read as movement through real Life Map depth and parallax, not a fake UI scaling trick, wormhole, radial streak tunnel, screen wipe, or unexplained teleport.

## Focus behavior

Focus keeps one authorized selected memory primary while nearby context remains secondary. Public actions should prefer:

- Explore
- Recenter
- Enter Replay
- Return to Life Map

**Close Inspection** is the preferred design term for intentionally moving nearer to the selected memory. Do not use `Deep Focus`, which collides with the historical productivity concept.

## Focus -> Replay

The selected memory remains the identity anchor. Enter Replay must preserve the governed memory identity and context, including the relevant memory ID, star ID, replay manifest, privacy state, and return checkpoint where the runtime supports them.

`MemoryAperture`, `entryPortal`, or similar internal travel names are implementation mechanics only. The user-facing action is **Enter Replay**. The memory itself owns the transition visually.

## Return/unwind

Conceptual unwind is:

`Replay -> Focus -> Life Map -> Home`

Back/Escape should unwind one spatial layer at a time where the active route contract supports it and should preserve selected context/checkpoints rather than dumping the user into an unrelated state.

## Accessibility and input language

Current supported terminology should reflect actual runtime capabilities: pointer, click, hover/focus, keyboard, drag/orbit, scroll, pinch, touch, Recenter, Escape/back, reduced motion, and semantic non-WebGL access where implemented.

XR/controller behavior must be described as **Future XR / Spatial Input** until current runtime authority proves it is shipping.

Reduced motion must preserve meaning: the user still understands that a memory was selected, approached, and reached in Focus.

## Privacy and truth boundary

- No fabricated personal memory.
- Demo fixtures remain explicitly disclosed.
- Deleted memories stay unavailable.
- Unauthorized memories fail closed.
- Corrupt/incomplete manifests fail safely.
- Place, person, emotional, media, and Replay context must not be invented.
- Replay must not bypass selected-memory privacy authority.

## Visual lock

Focus should read as a real authored spatial place: physically layered, materially rich, cinematic, restrained, emotionally coherent, premium, deep rather than flat, and alive rather than frozen.

Reject generic Three.js-demo language, glowing-sphere demos, obvious primitive geometry, cartoon swirls, ring cages, cheap hologram UI, giant HUD cards, excessive bloom, rainbow gradients, fake sci-fi tunnels, generic visible portals, and flat thumbnails pasted onto 3D objects.

## Central mental model

**Life Map is the world.**

**A Memory Star is the distant identity of a memory.**

**The user selects it and travels toward that same memory through real spatial continuity.**

**The star resolves into greater material and informational depth; the memory begins revealing itself during approach.**

**Focus is encountering that selected memory up close.**

**Close Inspection brings the user nearer.**

**Enter Replay moves deeper into the same selected memory.**

**Replay reconstructs the memory cinematically.**

**Return reverses the hierarchy: Replay -> Focus -> Life Map.**

A safe public tagline is: **Every Memory Star holds more than you can see from a distance.**
