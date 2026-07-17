# Final AAA+++ World Convergence

Authority issue: #639

## Founder verdict

The production route chain is functional, but the real-device Android evidence shows five visually disconnected route pages rather than one continuous spatial world.

The finishing objective is not another polish pass. It is a mental-model correction:

> Home → Ground → Life Map → Focus → Replay must feel like one uninterrupted place, one persistent camera journey, one Orb companion, and one retained memory identity.

## Current visual defects

### Home

- Editorial header and empty dark area consume the first screen.
- The actual world is miniature and distant.
- Orb identity is duplicated in-scene and as a large page control.
- Instruction text floats over the world.
- Terrain fills space without creating a navigable destination.

### Ground

- A large descriptive card dominates the realm.
- Permanent web navigation turns the scene into a page.
- Infrastructure destinations appear as a small tabletop model instead of places the user approaches.
- Camera scale, depth, occlusion, atmosphere, and movement do not create embodiment.

### Life Map

- A marketing headline panel obscures the active universe.
- Memory nodes appear as cropped decorative planets rather than selectable stars connected through time and relationships.
- Focus and Replay controls are detached page actions rather than portals on the selected memory.

### Focus

- Strong artwork, but the experience is a static poster.
- No continuous arrival from the selected Life Map star.
- No surrounding chamber, fragments, relationship traces, embodied presence, or responsive spatial motion.

### Replay

- Strong cinematic image and typography, but it reads as a video page.
- The memory does not form around the user.
- Playback lacks visible spatial staging from arrival through emotion, pattern, and return.

## Architecture direction

Create a shared `SpatialWorldShell` responsible for:

- full-viewport world composition;
- persistent Orb ownership;
- camera and transition state;
- route-state serialization/restoration;
- environment, lighting, atmosphere, audio, haptics, and accessibility hooks;
- mobile safe-area composition;
- reduced-motion and high-contrast equivalents;
- transition veil and fail-closed recovery.

URLs remain valid for deep links and recovery, but route changes must be presented as travel through the world rather than replacement of page shells.

## Ordered execution

1. Build the persistent shell and state contract.
2. Recompose Home as an inhabitable sanctuary.
3. Scale Ground into a navigable infrastructure realm.
4. Rebuild Life Map around explorable constellation depth.
5. Turn Focus into an entered memory chamber.
6. Turn Replay into staged spatial memory playback.
7. Add mobile-first visual and continuity contracts.
8. Capture exact-head journey artifacts and obtain genuine visual/accessibility review.
9. Merge the reviewed head, deploy through protected production authority, and retain live Android/desktop receipts plus rollback proof.

## Mobile proof matrix

Required baselines:

- 360×800
- 393×873
- 412×915
- 432×960
- tablet portrait
- desktop
- reduced motion
- high contrast
- no-WebGL fallback

The test viewport must account for real mobile browser chrome and safe areas.

## Release acceptance

- Each route reads as a place before it reads as interface.
- No giant SaaS or marketing card dominates the active world.
- No permanent conventional route navbar covers the scene.
- Only one Orb appears as the persistent companion.
- Home and Ground feel full-scale and inhabitable on a phone.
- Life Map is immediately explorable.
- Focus visibly preserves and enters the selected memory.
- Replay surrounds the user with a staged memory film.
- Returning restores exact memory, camera, and world context.
- Accessibility, security, privacy, static export, performance, release governance, and rollback controls remain intact.

## Exact-head visual certification retry

The prior exact-head visual workflow was cancelled after successful checkout, build, and browser installation. This documentation-only commit intentionally creates a new immutable candidate so the complete visual-proof workflow and all dependent release gates can run again without reusing evidence from a superseded SHA.

Promotion remains blocked until the new exact head has terminal-success visual evidence and the retained screenshots are manually inspected.

## Safety

No intermediate production deployment. No weakening of exact-head proof, protected release, credentials, consent, privacy, provider, billing, data, or rollback boundaries.
