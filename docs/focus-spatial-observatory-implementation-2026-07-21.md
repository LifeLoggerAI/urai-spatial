# URAI Focus Spatial Observatory — Canonical Decision and Implementation Record

Date: 2026-07-21

Status: DRAFT IMPLEMENTATION / NO PRODUCTION CLAIM

Repository: `LifeLoggerAI/urai-spatial`

Application: `urai-tier1`

Stacked base: `repair/spatial-world-continuity-20260721` at `6c7ccef010cbe51726cfb573476e458fdbe0206e`

Implementation branch: `focus/spatial-memory-observatory-20260721`

## Canonical semantic decision

`/focus` is the inhabitable selected-memory chamber between Life Map and Replay. A Life Map star remains the identity anchor, expands into a private spatial chamber, and opens into Replay. The older intelligent productivity/focus-session product document is retained as historical research and does not govern this route.

Direct `/focus` entry is a neutral Focus Observatory. It contains no fabricated personal memory, remains spatially explorable, and sends the user to Life Map to select a real or explicitly disclosed demonstration star.

## Architecture decision

The route extends the repository's current React Three Fiber and adaptive-quality systems instead of adding a separate rendering stack. It preserves `useSelectedMemory`, persistent world travel events, truthful explicit-demo handling, memory/manifest/star identity, deterministic Escape return, and existing privacy boundaries.

The bounded exploration model is a hybrid:

- drag/orbit and scroll or pinch depth through `OrbitControls`;
- W/A/S/D and arrow-key planar travel;
- constrained camera and target volume;
- a deterministic Recenter checkpoint;
- no unrestricted free flight or uncontrolled roll.

## Gap matrix

| Area | Intended final behavior | Previous implementation | Gap severity | Implemented repair | Required evidence | State |
| --- | --- | --- | --- | --- | --- | --- |
| Direct `/focus` entry | Useful neutral spatial threshold with no fake memory | Full-screen unavailable alert and one return button | Critical | Neutral Focus Observatory, explorable chamber, Life Map action, truthful status | Desktop/mobile capture; identity-free route test | Implemented, unverified |
| Spatial depth | Real viewpoint change, foreground/midground/far depth | Static CSS background and clipped star | Critical | R3F chamber architecture, floor, rings, stars, trace landmarks, fog and local lights | Movement captures from multiple camera positions | Implemented, unverified |
| Camera | Bounded, recoverable orbit/depth/travel | No camera | Critical | Orbit/touch controls, keyboard travel, clamps and Recenter | Keyboard/touch E2E; no-clipping visual proof | Implemented, unverified |
| Selected star identity | Central memory aperture remains the chosen star | CSS star-shaped button | High | Data-bound central aperture using selected memory colors and exact IDs | Life Map→Focus identity assertion and screenshot | Implemented, unverified |
| Replay entry | Debounced portal preserving memory, star and manifest | Single button preserved identity but lacked spatial activation | High | 3D aperture plus accessible HUD action and committed travel guard | Repeated-click and route-context tests | Implemented, unverified |
| Error/data states | Chamber persists for loading, denied, missing, corrupt and deleted states | Entire route replaced by error page | Critical | Spatial room remains mounted; status and recovery controls remain available | State matrix captures and semantic tests | Implemented, partial verification |
| Privacy | No silent demo or fabricated personal data | Existing privacy hook was correct | Must preserve | No demo fixture imported into Focus; selected-memory hook remains authority | Existing production memory contract | Preserved, unverified |
| Accessibility | Keyboard, focus visibility, reduced motion and non-WebGL path | Basic buttons and reduced animation only | High | Keyboard travel, explicit instructions, Recenter, visible focus, reduced-motion branch and WebGL fallback | axe/keyboard/reduced-motion evidence | Implemented, unverified |
| Performance | Adaptive quality and hidden-tab pause | Static CSS was inexpensive but not spatial | High | Existing adaptive profile, DPR caps, tiered effects and `frameloop` visibility control | Build bundle, FPS and first-frame evidence | Implemented, unverified |
| Responsive layout | Purpose-built desktop and mobile controls | CSS responsive static composition | High | Touch canvas, safe-area controls and mobile HUD rearrangement | Desktop, portrait and narrow captures | Implemented, unverified |
| Production proof | Exact-head CI, retained visuals, protected deployment and rollback | Existing public screenshot proves failure | Critical | Source and tests prepared on isolated branch | Exact-head workflows, human visual acceptance and protected release receipt | Not complete |

## Privacy and data rules

- Focus never imports seeded or generic spatial demo data.
- Personal memory content is mounted only after `useSelectedMemory` authorizes and parses it.
- Explicit demonstration identity remains opt-in and labeled `DEMO FIXTURE · NOT PERSONAL DATA`.
- Neutral direct entry does not infer people, place, emotion or narrative.
- Memory trace count derives only from already-authorized people, emotional-arc and place fields; it does not invent labels or relationships.

## Performance targets for verification

These are acceptance targets, not yet measured claims:

- median first interactive spatial frame: no more than 2.5 seconds on the CI desktop profile;
- sustained desktop frame rate: at least 50 FPS average and 35 FPS 1% low on the governed capture profile;
- sustained representative mobile frame rate: at least 30 FPS average;
- input response: under 100 ms for HUD actions and under one animation frame for camera input;
- no cumulative layout shift from the fixed route shell;
- no animation loop while the document is hidden;
- low-tier path disables postprocessing and shadows and lowers stars/particles;
- reduced-motion path removes ambient rotation and animated pulse.

## Release gates

This branch must remain NO-GO until all of the following are true:

1. Typecheck, build and relevant unit/contract suites pass on the exact branch head.
2. Desktop, portrait-mobile, keyboard, reduced-motion and WebGL-fallback captures are retained.
3. Captures prove actual camera movement and parallax, not only a prettier static frame.
4. Life Map→Focus→Replay→Focus→Life Map preserves exact memory, node, manifest and checkpoint identity.
5. No branch-caused required check is failing.
6. A genuine visual/accessibility review accepts the exact head.
7. The stacked base is merged or the Focus branch is rebased without losing reviewed evidence.
8. Protected deployment and live smoke bind the public runtime to the exact merged SHA.
9. A rollback SHA and retained rollback proof are recorded.

## Current verdict

Source implementation has begun and is isolated from production. It is not yet build-verified, visually accepted, merged, deployed or live. The correct current verdict is **NO-GO pending exact-head CI and visual evidence**.
