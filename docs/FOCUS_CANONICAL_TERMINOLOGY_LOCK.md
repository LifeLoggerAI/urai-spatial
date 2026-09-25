# URAI Focus — Canonical Terminology & Experience Lock

Authority date: 2026-09-15
Governing repository: `LifeLoggerAI/urai-spatial`
Canonical route: `/focus`
Base authority at creation: `b4db4ed6224eb0e392205c78657050c5d288b8f0`
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

## Engineering vocabulary that may remain internal

Stable implementation identifiers may remain when renaming would create churn without product benefit, including `LifeMapNode`, `SelectedMemory`, `FocusChamberClient`, `MemoryAperture`, `cameraCheckpoint`, `entryPortal`, `manifestId`, `memoryId`, `starId`, `nodeId`, and governed asset filenames such as `focus-memory-chamber-v1.glb`.

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
- visible Focus portal
- visible Replay portal

## Life Map node vs Memory Star

`LifeMapNode` is the generic graph entity. Do not describe every Life Map node as a memory.

A **Memory Star** is the canonical Life Map-scale identity of a memory. Its far-distance presentation may read as a luminous point while close-range rendering resolves into more authored, irregular, material, and volumetric structure. It does not need to be a literal glowing sphere.

Use **Related Context** for the generic local graph around Focus. Use **Related Memories** only when the neighboring entities are actually memories.

## Life Map -> Focus choreography

Preserve the existing Life Map runtime phases where they remain authoritative:

`overview -> departure -> travel -> approach -> arrival`

The following are visual choreography within that journey: Memory Attention, Memory Selection, acknowledgement, target acquisition, departure, initial pull, travel, acceleration, approach, Memory Star resolves, Memory Reveal, deceleration, Focus Arrival.

Travel must read as movement through real Life Map depth and parallax, not a fake UI scaling trick, wormhole, radial streak tunnel, screen wipe, or unexplained teleport.

## Focus behavior

Focus keeps one authorized selected memory primary while nearby context remains secondary. Public actions should prefer Explore, Recenter, Enter Replay, and Return to Life Map.

**Close Inspection** is the preferred design term for intentionally moving nearer to the selected memory. Do not use `Deep Focus`.

## Focus -> Replay

The selected memory remains the identity anchor. Enter Replay must preserve the governed memory identity and context, including the relevant memory ID, star ID, replay manifest, privacy state, and return checkpoint where the runtime supports them.

The user-facing action is **Enter Replay**. The memory itself owns the transition visually.

## Return/unwind

Conceptual unwind is:

`Replay -> Focus -> Life Map -> Home`

Back/Escape should unwind one spatial layer at a time where the active route contract supports it and should preserve selected context/checkpoints rather than dumping the user into an unrelated state.

## Accessibility and input language

Current supported terminology should reflect actual runtime capabilities: pointer, click, hover/focus, keyboard, drag/orbit, scroll, pinch, touch, Recenter, Escape/back, reduced motion, and semantic non-WebGL access where implemented.

Reduced motion must preserve meaning: the user still understands that a memory was selected, approached, and reached in Focus.

## Privacy and truth boundary

- No fabricated personal memory.
- Demo fixtures remain explicitly disclosed.
- Deleted memories stay unavailable.
- Unauthorized memories fail closed.
- Corrupt/incomplete manifests fail safely.
- Replay must not bypass selected-memory privacy authority.

## Visual lock

Focus should read as a real authored spatial place: physically layered, materially rich, cinematic, restrained, emotionally coherent, premium, deep rather than flat, and alive rather than frozen.

Reject generic Three.js-demo language, glowing-sphere demos, obvious primitive geometry, cartoon swirls, ring cages, cheap hologram UI, giant HUD cards, excessive bloom, rainbow gradients, fake sci-fi tunnels, generic visible portals, and flat thumbnails pasted onto 3D objects.

## Central mental model

**Life Map is the world.**

**A Memory Star is the distant identity of a memory.**

**The user selects it and travels toward that same memory through real spatial continuity.**

**Focus is encountering that selected memory up close.**

**Enter Replay moves deeper into the same selected memory.**

**Return reverses the hierarchy: Replay -> Focus -> Life Map.**
