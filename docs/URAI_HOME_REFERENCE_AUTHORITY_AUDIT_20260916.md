# UrAi Home Reference Authority Audit — 2026-09-16

Status: **current audit receipt for PR #1209 successor work; not a Gold-Master release receipt**.

This document records which Home references are authoritative, which remain useful only as historical/art-direction inputs, which are rejected, and what still requires current-lineage runtime proof.

## 1. Authority order

When Home sources disagree, use this order:

1. **Locked product canon explicitly agreed on 2026-09-16** and captured in `URAI_HOME_EMBODIMENT_CANON_V1.md`.
2. **Final reconciled exact source head** after #1209 Home semantics and current-lineage active renderer/Orb work are converged.
3. **Exact-head retained pixels + real interaction evidence** generated from that same unchanged source head.
4. Current implementation contracts/tests on that same head.
5. `URAI_HOME_MASTER_STORYBOARD_V1.md` for transition/motion intent where literal pixels do not yet exist.
6. Earlier GitHub/Drive design documents and concept images as historical or art-direction provenance only.

No old document, screenshot, generated image, prior workflow run, or predecessor SHA may override a later explicit locked canon decision.

## 2. Locked Home semantics

The following are current product truth:

- Home is a place, not a menu.
- `HOME_PRESENTATION` is the cinematic third-person anchor.
- The user's Avatar is visible at `HOME_PRESENTATION`.
- Activating the Avatar embodies the user; it does not open a profile page.
- `AVATAR_HOME_FIRST_PERSON` is a persistent walkable first-person mode in the same Home world.
- Desktop/mobile/flat-screen-controller first person is **camera-only**. No visible hands, forearms, torso, legs, feet, or first-person body rig.
- Future XR/VR may show tracked hands/controllers when backed by real tracking.
- `AVATAR_SELF_VIEW` is the deliberate place to inspect Avatar appearance and safe user-facing state while remaining semantically inside first-person Home.
- The actual broad Sky is the Life Map entry surface.
- The actual terrain is the Ground entry surface.
- The physical Orb is the conversational intelligence entry surface.
- No Home Life Map portal/ring/white dot/doorway and no Ground button/hotspot.
- Direct fast paths from `HOME_PRESENTATION` to Sky, Ground, and Orb remain valid.
- First-person Home may enter Sky, Ground, and Orb directly without returning to third person.
- ESC/Back unwinds exactly one semantic/spatial layer and restores the recorded immediate origin.
- Return continuity includes mode, safe position/orientation, environment revision/time/weather context, and Orb state where meaningful.

## 3. Current GitHub implementation truth

### PR #1177 — source authority, not Gold Master

Current #1177 documents that its exact source still contains an older Home behavior and is a moving source authority with known Home-canon conflict. It also records that final convergence must combine child lanes and re-prove the final exact head.

Do not certify Home directly from old #1177 retained pixels or predecessor first-person/no-avatar contracts.

### PR #1214 — current-lineage active Home/Orb implementation

Current #1214 is based on the current #1177 lineage and already provides important pieces that match the locked canon:

- visible governed MakeHuman V4 Avatar in active `HomeWorldProductionV223`;
- governed authored Orb body;
- broad Sky remains the Life Map interaction;
- no synthetic first-person hands;
- improved Orb state/acoustic truth.

Audit limitation: the active V223 Avatar is currently presentation-only. It does not yet implement Avatar-click embodiment, persistent walkable first-person Home, Self View, or #1209's semantic origin/return controller.

### PR #1209 — Home semantic/embodiment successor

This lane owns the isolated Home semantics needed to complete the locked Home behavior:

- Home experience reducer;
- origin-aware return stack;
- runtime controller;
- presentation Avatar component;
- Avatar Self View;
- canonical Home embodiment specification;
- 30-frame textual storyboard;
- focused Home contracts.

It is not the final active-renderer authority until reconciled onto the current #1214/#1177 lineage.

## 4. Visual reference classification

### Accepted as art-direction reference

The Home image sets showing an Avatar viewed from behind beside the Orb across dawn/morning/midday/afternoon/sunset/twilight/night/overcast/rain/fog/snow and varied landscapes are useful for:

- third-person Avatar/Orb relationship;
- world-first composition;
- scale and atmosphere;
- environmental time/weather variety;
- restrained UI;
- landscape/location mood exploration.

They are **not** by themselves proof of:

- exact runtime camera coordinates/FOV;
- exact Avatar asset/materials;
- live geolocation;
- live weather synchronization;
- final terrain topology;
- final literal pixels.

City/country image sets are environmental concept references only unless a separate approved runtime capability explicitly binds a user's chosen/authorized location to the environment.

### Rejected reference

The generated Home journey infographic that depicted hands/arms in ordinary non-XR first-person frames is **rejected**. It must not be used for implementation or visual acceptance.

The textual storyboard explicitly supersedes it: non-XR FPV is camera-only.

### Historical GitHub/Drive references

Older `home.txt`, `avatar.txt`, `camera.txt`, `ground.txt`, `life-map.txt`, prior Home execution receipts, old portal assets, and predecessor Home implementations remain useful for design provenance, asset ideas, accessibility concerns, transition intent, and system history.

They are mixed-era sources. Any statement in them implying one of the following is stale under the current canon:

- Home is permanently first-person;
- Home has no visible Avatar;
- Avatar activation is merely profile/configuration navigation;
- Life Map requires a localized portal/ring/white dot;
- Ground requires a button/gateway sculpture;
- ESC always returns directly to root/cinematic Home regardless of entry origin;
- ordinary desktop/mobile FPV displays synthetic hands/body.

## 5. Camera/reference rules

`HOME_PRESENTATION`:

- third-person cinematic composition;
- Avatar visible, back/three-quarter-back presentation preferred;
- Orb remains a primary relational focal point without behaving like a centered button;
- meaningful terrain and broad Sky stay visible;
- bounded look/parallax is acceptable; free first-person locomotion is not active until Avatar embodiment.

`AVATAR_HOME_FIRST_PERSON`:

- same world and coordinates;
- camera enters calibrated Avatar eye position;
- exterior Avatar hidden from direct viewport after perceptual crossing;
- no non-XR player body parts;
- calm human locomotion, near-zero head bob, no default sprint/jump;
- Sky and Ground remain physically targetable by looking into the world.

Only one camera owner may write the pose in any frame.

## 6. Self View/reference rules

Self View is not an RPG character sheet.

Allowed default groups:

- Appearance;
- user-approved Identity/Passport link;
- Embodiment settings/status;
- non-sensitive Journey progression;
- Accessibility;
- Privacy/provenance.

Default exclusions:

- raw health/wellness signals;
- inferred emotion;
- private memory text;
- precise location;
- raw device telemetry;
- fake scores or combat attributes.

The current component must maintain modal focus ownership, restore focus on close, use one-layer Escape/Back, and preserve at least 44 CSS px touch targets.

## 7. Sky / Ground / Orb reference rules

### Sky

The entire visible sky is the Life Map interaction surface. Target feedback must remain atmospheric, not a pasted UI object. Ascent must preserve spatial continuity from Home through atmosphere into the Life Map threshold.

### Ground

Ground is entered through actual terrain. Feedback must remain material/environmental. Descending should feel spatially related to the selected/occupied Home location.

### Orb

Orb is physically present in Home and should remain perceptually connected to conversation. The conversation surface may use familiar readable chat ergonomics, but must not feel like an unrelated generic modal.

## 8. ESC / Back authority

Canonical rule: one semantic layer per unwind.

Examples:

- `AVATAR_SELF_VIEW -> AVATAR_HOME_FIRST_PERSON -> HOME_PRESENTATION`
- `LIFE_MAP -> AVATAR_HOME_FIRST_PERSON -> HOME_PRESENTATION` when Life Map was entered from first-person Home.
- `LIFE_MAP -> HOME_PRESENTATION` when entered directly from presentation Home.
- `IMMERSIVE_CONVERSATION -> AVATAR_HOME_FIRST_PERSON -> HOME_PRESENTATION` when Orb was entered from first-person Home.

Browser Back, mobile system Back, and keyboard Escape must reconcile to this same semantic model rather than competing with it.

## 9. Audit repairs made in #1209

The 2026-09-16 audit found and repaired:

- successor tests existed but were not in the compact CI unit runner;
- world-surface actions were insufficiently guarded against non-world overlay/conversation states;
- session return-frame parsing was not validating the complete safe schema;
- Self View needed deterministic focus trapping and explicit modal Escape ownership;
- the global Home Escape listener needed to yield to the Self View modal;
- the MakeHuman Avatar clone needed skeleton-safe cloning rather than generic recursive object cloning;
- the hand-bearing non-XR concept image needed explicit invalidation so it could not be mistaken for accepted art.

## 10. Still required before Home Gold Master

This audit does **not** mark Home complete. Final acceptance still requires one reconciled exact source head containing current-lineage active renderer + #1209 semantics, followed by:

- Avatar click -> embodiment wired in active V223/successor renderer;
- walkable first-person Home wired to shared locomotion kernel;
- bodyless non-XR first-person literal-pixel proof;
- Self View wired and pixel/keyboard/screen-reader tested;
- origin-aware Ground/Life Map/Orb return wired across real route boundaries;
- mobile/controller/back-stack real interaction evidence;
- reduced-motion proof;
- current exact-head typecheck/build/contracts;
- literal retained-pixel inspection for presentation, embodiment, first-person, Self View, Orb, ascent, Life Map return, Ground descent/return, and embodiment unwind;
- accessibility/performance/privacy/security evidence on the unchanged candidate;
- independent exact-head review/governance where required.

Until those are current on one unchanged source head, Home remains a converging candidate rather than a frozen Gold Master.
