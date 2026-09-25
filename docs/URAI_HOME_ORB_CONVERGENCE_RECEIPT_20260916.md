# UrAi Home + Orb Convergence Receipt — 2026-09-16

## Status

This branch is a **current-lineage convergence candidate**, not Gold Master, not deployed production, and not literal-pixel acceptance.

Created from exact PR #1214 head `4519f235023a5630743706746eb70f60ffb87356`, itself based on current PR #1177 exact head `2cf87f6d598ade500c8f1079ea80b6fb73325b3f`.

Current convergence PR: #1230, branch `home-orb-embodiment-convergence-20260916`.

GitHub live head metadata is authoritative if this document becomes stale after another source commit.

## Locked Home semantics

1. `HOME_PRESENTATION` is cinematic third-person Home with the governed user Avatar visible.
2. Activating the Avatar means embodiment, not profile navigation.
3. `AVATAR_HOME_FIRST_PERSON` is a persistent walkable state in the same Home world.
4. Flat-screen desktop/mobile/controller first person is camera-only: no synthetic hands, forearms, torso, legs, feet, tool rig, or fake FPS body.
5. XR/VR is the only future runtime allowed to show tracked hands/controllers where real pose tracking exists.
6. `AVATAR_SELF_VIEW` is a privacy-bounded self-inspection layer over first-person Home.
7. The actual broad sky is Life Map entry; no white dot, ring, portal, doorway, or floating Life Map button.
8. The actual terrain is Ground entry; no Ground destination sculpture/button/hotspot.
9. The physical Orb is conversational intelligence; conversation remains perceptually tied to the Orb.
10. ESC/Back unwinds exactly one semantic/spatial layer and restores the recorded stable origin.

## Current combined source present on this branch

Inherited from #1214 current lineage:

- active `HomeWorldProductionV223` with visible MakeHuman V4 Avatar;
- governed authored living-memory Orb body;
- broad-sky Life Map ownership;
- Orb one-shot state clips plus procedural persistent life;
- actual-playback-bound speech clock and local RMS analysis where available;
- explicit local microphone VAD/barge-in without false transcription/upload/retention claims;
- adaptive Orb effect ceilings owned by the shared Spatial quality tier.

Added from the Home embodiment successor lane:

- `src/spatial/home/homeExperienceState.ts` semantic state/return authority;
- `src/spatial/home/useHomeExperienceController.ts` origin capture, semantic action and return-frame controller;
- `src/spatial/home/HomeEmbodiedAvatar.tsx` skeleton-safe interactive Avatar embodiment component;
- `src/spatial/home/AvatarSelfView.tsx` keyboard/focus-safe privacy-bounded Self View;
- focused contracts for state, controller, Avatar/Self View and active-Home invariants;
- both focused and compact contract runners now execute the new Home embodiment suites.

## Explicit non-authority references

- Earlier generated non-XR first-person images that show hands/body are rejected and cannot certify Home.
- Older Drive `home.txt`, `avatar.txt`, `camera.txt`, `ground.txt`, `life-map.txt`, old execution receipts and prior retained pixels are provenance unless revalidated against this final canon.
- Generic scenic reference imagery may guide environment, lighting, weather, landscape, Avatar/Orb relationship and cinematography; it does not itself prove runtime GPS, weather, exact geometry, exact FOV or literal final pixels.

## Remaining source integration

The active V223 renderer still needs to consume the semantic embodiment controller rather than merely rendering a presentation Avatar. Final integration must:

- replace presentation-only Avatar ownership with the interactive skeleton-safe Avatar component or equivalent behavior;
- acquire/release camera ownership for `AVATAR_EMBODIMENT_TRANSITION`, `AVATAR_HOME_FIRST_PERSON`, `EMBODIMENT_UNWIND`, destination transitions and return unwinds;
- add calm bounded first-person locomotion/collision without introducing a body rig;
- preserve #1214 Orb behavior and broad-sky Life Map ownership;
- wire Self View from first-person Home;
- reconcile browser/mobile Back with actual route/history ownership, not only a local `popstate` listener;
- restore origin position/yaw/pitch/environment/Orb state on Ground/Life Map return;
- keep reduced-motion semantic equivalence.

## Remaining proof before Gold Master

Required on one unchanged final exact source head:

- source/type/build/contracts green;
- privacy/security green;
- accessibility/performance evidence current;
- desktop/mobile/reduced-motion real interaction proof;
- literal retained-pixel captures opened and inspected, including Home Presentation, embodiment midpoint, first-person Home, Self View, Orb states, sky ascent, Ground descent and returns;
- no stale portal/white-dot/Ground-hotspot or non-XR hand/body regression;
- independent eligible exact-head review after source and pixels stabilize;
- Release Governance Guard green with `APPROVED_SHA` equal to the unchanged release SHA;
- protected merge, protected deployment and live deployed-SHA/pixel verification only after all gates permit them.

## Release boundary

Do not merge/deploy this draft merely because source checks become green. Green source is necessary but does not substitute for literal pixels, accessibility/performance, independent review or governance.
