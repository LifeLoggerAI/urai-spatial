# UrAi Home Embodiment Canon V1

Status: **candidate authority for reconciliation into the active Home branch**  
Scope: Home Presentation, Avatar embodiment, First-Person Home, Self View, Ground, Sky/Life Map, Orb conversation, semantic unwind, accessibility, continuity, and failure handling.

> **HOME IS A PLACE, NOT A MENU.**

> **HOME PRESENTATION IS THE CINEMATIC THIRD-PERSON ANCHOR.**

> **THE AVATAR IS THE USER'S EMBODIED ANCHOR, NOT DECORATIVE SCENERY.**

> **CLICKING THE AVATAR MOVES THE CAMERA INTO THE AVATAR AND CREATES A PERSISTENT WALKABLE FIRST-PERSON HOME.**

> **FIRST-PERSON HOME IS A STABLE MODE, NOT A TEMPORARY TRANSITION.**

> **STANDARD DESKTOP / MOBILE / CONTROLLER FIRST-PERSON HOME IS CAMERA-ONLY: NO VISIBLE HANDS, FOREARMS, TORSO, LEGS, FEET, OR FIRST-PERSON BODY MESH. VISIBLE TRACKED HANDS / CONTROLLERS ARE XR-ONLY.**

> **FROM FIRST-PERSON HOME THE USER MAY INSPECT THEIR AVATAR, WALK THE ENVIRONMENT, ENTER GROUND, ASCEND THROUGH THE SKY INTO LIFE MAP, OR APPROACH THE ORB AND ENTER CONVERSATION WITHOUT RETURNING TO THIRD PERSON.**

> **THE SKY ITSELF IS THE LIFE MAP ENTRY SURFACE.**

> **GROUND IS ENTERED THROUGH THE ACTUAL WORLD BENEATH THE USER.**

> **THE ORB IS THE PHYSICAL CONVERSATIONAL INTELLIGENCE OF HOME.**

> **ESC / BACK UNWINDS EXACTLY ONE SEMANTIC OR SPATIAL LAYER AND RESTORES THE IMMEDIATELY PREVIOUS STABLE STATE.**

> **RETURNING FROM A DESTINATION SHOULD FEEL LIKE COMING BACK TO THE PLACE THE USER LEFT, NOT RELOADING A SCREEN.**

## 1. Stable Home states

### HOME_PRESENTATION

The opening state is a premium, deliberately composed third-person view of the user's world.

Required:

- the user's Avatar is visible;
- the Orb is visible and physically grounded in the scene;
- the ground is continuous terrain, not a destination button;
- the sky occupies meaningful frame area and is the direct Life Map surface;
- the composition remains cinematic and bounded rather than becoming a free camera;
- environment time, weather, lighting, fog, vegetation, reflections, and Orb activity remain alive;
- conventional UI remains minimal and non-dominant;
- the same 3D world continues into first person.

Primary physical interaction surfaces:

1. Avatar -> `AVATAR_EMBODIMENT_TRANSITION` -> `AVATAR_HOME_FIRST_PERSON`
2. Ground -> `GROUND_DESCENT` -> Ground
3. Sky -> `SKY_ASCENT` -> Life Map
4. Orb -> `ORB_TRANSFORMATION` -> `IMMERSIVE_CONVERSATION`

### AVATAR_HOME_FIRST_PERSON

This is a persistent embodied state, not a cutaway or alternate map.

Required:

- same Home coordinates and environment;
- no duplicate exterior Avatar rendered in front of the user;
- standard non-XR first person is camera-only with no rendered hands/body in the direct viewport;
- user can walk, turn, look, stop, and inspect surroundings;
- user can remain here indefinitely;
- user can enter Ground, Life Map, or Orb conversation directly;
- user can open `AVATAR_SELF_VIEW` without exiting first person;
- ESC performs `EMBODIMENT_UNWIND` to `HOME_PRESENTATION` only when no deeper semantic layer is open.

## 2. Avatar embodiment

Semantic meaning: **I was looking at myself in my world. Now I am stepping into myself.**

Normal-motion choreography:

1. Avatar acknowledges targeting with restrained gaze/posture/light response.
2. User activates Avatar.
3. Input ownership transfers to the embodiment transition.
4. Camera leaves the locked presentation rail and approaches the Avatar from the established composition.
5. Avatar grows naturally in frame; no teleport cut.
6. Camera crosses the body's perceptual threshold at head/eye position.
7. Exterior Avatar rendering is disabled for the embodied viewpoint.
8. No first-person hands/body geometry appears on desktop, mobile, or controller modes.
9. First-person eye position stabilizes.
10. Locomotion unlocks only after the stable first-person pose is established.

Reduced-motion choreography:

- preserve the same semantic state change;
- use a short eased camera convergence or perceptual dissolve rather than long travel;
- never flash or hard cut between unrelated compositions;
- locomotion unlock remains gated on completion.

Interruptions:

- ESC before completion -> `HOME_RESTORE` -> exact `HOME_PRESENTATION` camera;
- repeated Avatar activation while locked -> ignored;
- renderer loss -> recover the latest stable state, never a half-embodied pose.

## 3. First-person locomotion

V1 target values are product constants and may be tuned through literal-pixel/comfort acceptance without changing semantic behavior.

- walk speed: calm human pace, approximately 2.4-2.8 world units/s;
- acceleration: approximately 7-9;
- deceleration: approximately 9-12;
- no sprint by default;
- no game-like jump by default;
- eye height: approximately 1.58-1.68 world units depending on avatar/body calibration;
- head bob: near-zero by default; optional subtle comfort-safe micro-motion only;
- collision: terrain + authored obstacle volumes;
- movement bounds: world-authored, never arbitrary browser-edge clamping visible to the user;
- camera near plane must remain safe through embodiment even though the exterior body is hidden after threshold;
- recovery action returns the user to a safe local anchor without erasing session context.

Desktop:

- WASD and arrows move;
- pointer drag or pointer lock look may be used only under one clear ownership model;
- Enter/Space or contextual click activates the current target;
- ESC unwinds one semantic layer;
- no visible player hands/body rig.

Mobile:

- touch look and movement controls must never compete for the same gesture;
- minimum touch target 44 CSS px;
- landscape and portrait safe areas respected;
- movement control placement must not cover Orb, Avatar Self View, or return controls;
- system Back follows semantic unwind;
- no visible player hands/body rig.

Controller:

- left stick move;
- right stick look;
- primary action interact;
- Back/B performs semantic unwind;
- configurable dead zones and look sensitivity;
- no visible player hands/body rig.

Future XR:

- same state machine;
- seated/standing options;
- snap/smooth turn;
- optional teleport for comfort;
- direct/gaze interaction equivalents;
- tracked hands or controller representations may be visible when the XR runtime provides real pose tracking;
- XR hand/controller visibility must never leak into flat-screen desktop/mobile/controller first-person presentation;
- never fork product semantics into an incompatible XR-only navigation model.

## 4. Avatar Self View

State path:

`AVATAR_HOME_FIRST_PERSON -> AVATAR_SELF_VIEW -> AVATAR_HOME_FIRST_PERSON`

Self View is an in-world self-inspection layer, not an RPG inventory screen.

### Entry

V1 authority: expose one explicit, accessible self-inspection action while embodied, reinforced by world-coherent reflection/mirror affordances when present. Looking down at a rendered body is not a V1 self-inspection mechanism because standard non-XR first person intentionally renders no direct-view body geometry.

### Information hierarchy

Allowed V1 categories:

1. **Appearance** - avatar representation, presentation, clothing/style customization state.
2. **Identity & Passport link** - only user-approved profile fields.
3. **Embodiment** - first-person camera mode, movement preferences, voice/avatar pairing status.
4. **Journey** - non-sensitive progression/milestones and unlocked visual elements.
5. **Accessibility** - movement/visual/audio comfort settings, clearly private.
6. **Privacy** - visibility controls and provenance labels for any surfaced personal data.

Do not display raw health/wellness signals, private memory text, inferred emotion, device telemetry, or location merely because the runtime can access them.

### Presentation

- world remains faintly perceptible around the interface;
- one clear focus plane;
- no giant stats grid;
- no combat/game attributes;
- no fake scores;
- data provenance available for every personal field;
- loading, empty, error, and offline states are explicit;
- ESC closes Self View only.

## 5. Sky -> Life Map

The sky is the entry surface. No separate Life Map portal, ring, white dot, doorway, floating button, or spatial badge is permitted on Home.

Direct from `HOME_PRESENTATION`:

`HOME_PRESENTATION -> SKY_ASCENT -> LIFE_MAP`

From embodied Home:

`AVATAR_HOME_FIRST_PERSON -> SKY_ASCENT -> LIFE_MAP`

First-person entry preserves embodiment through ascent. The exterior Avatar must not appear during ascent. Non-XR ascent remains camera-only with no visible hands/body.

Choreography:

1. sky targeting response remains atmospheric, not UI-like;
2. commit tilts/aligns camera into the visible sky;
3. ground falls away spatially;
4. cloud/haze/weather pass around the camera;
5. atmospheric density and environmental audio change with altitude;
6. ordinary stars gain depth;
7. cosmic structure emerges continuously from the same sky;
8. memory stars become semantically distinct only after crossing the cosmic threshold;
9. camera settles into the Life Map exploration authority.

Forbidden: `click -> fade -> unrelated galaxy`.

## 6. Life Map return

Origin-aware return is mandatory.

If entered from `HOME_PRESENTATION`:

`LIFE_MAP -> LIFE_MAP_UNWIND -> atmospheric descent -> HOME_PRESENTATION`

If entered from `AVATAR_HOME_FIRST_PERSON`:

`LIFE_MAP -> LIFE_MAP_UNWIND -> atmospheric descent -> AVATAR_HOME_FIRST_PERSON`

Restore where meaningful:

- first-person vs third-person mode;
- prior first-person X/Z position;
- yaw/pitch;
- environment revision;
- time/weather continuity;
- Orb state;
- relevant local interaction context.

The return is one semantic unwind. A second ESC from restored first-person Home performs embodiment unwind.

## 7. Ground descent and return

Ground is entered through the actual terrain.

Direct:

`HOME_PRESENTATION -> GROUND_DESCENT -> GROUND`

Embodied:

`AVATAR_HOME_FIRST_PERSON -> GROUND_DESCENT -> GROUND`

The first-person path should conceptually descend from the location the user selected or occupied. V1 may quantize to safe entry anchors, but the perceptual contract must preserve local continuity.

Choreography:

- terrain acknowledges selection without a pasted hotspot;
- camera approaches/descends through the selected surface;
- local material scale grows;
- vegetation/soil/stone/root/water layers gain detail according to Ground canon;
- spatial sound closes in;
- final Ground state is first person;
- non-XR direct viewport remains bodyless/camera-only throughout descent and Ground arrival.

Return restores the recorded Home origin mode and local camera snapshot.

## 8. Orb -> immersive conversation

Direct:

`HOME_PRESENTATION -> ORB_TRANSFORMATION -> IMMERSIVE_CONVERSATION`

Embodied:

`AVATAR_HOME_FIRST_PERSON -> ORB_PROXIMITY -> ORB_TRANSFORMATION -> IMMERSIVE_CONVERSATION`

The Orb is not a button that opens a generic chatbot modal.

The conversation surface keeps familiar chat ergonomics:

- readable message history;
- clear composer;
- voice;
- attachments/media where authorized;
- keyboard and screen-reader correctness;
- conversation continuity;
- explicit listening/thinking/speaking/error states.

The transformation must remain visibly/perceptually connected to the physical Orb.

ESC from conversation collapses the Orb presentation and returns to the exact origin stable state. Conversation data persists.

## 9. Semantic unwind stack

Rule: **ESC / Back removes exactly one semantic or spatial layer.**

Examples:

`HOME_PRESENTATION -> AVATAR_HOME_FIRST_PERSON -> AVATAR_SELF_VIEW`

ESC sequence:

`AVATAR_SELF_VIEW -> AVATAR_HOME_FIRST_PERSON -> HOME_PRESENTATION`

`HOME_PRESENTATION -> AVATAR_HOME_FIRST_PERSON -> LIFE_MAP`

ESC sequence:

`LIFE_MAP -> AVATAR_HOME_FIRST_PERSON -> HOME_PRESENTATION`

`HOME_PRESENTATION -> AVATAR_HOME_FIRST_PERSON -> IMMERSIVE_CONVERSATION`

ESC sequence:

`IMMERSIVE_CONVERSATION -> AVATAR_HOME_FIRST_PERSON -> HOME_PRESENTATION`

Browser Back and mobile system Back must reconcile to the same semantic stack instead of creating a competing history model.

## 10. Origin snapshot contract

A destination handoff captures at minimum:

- stable Home mode;
- camera position;
- yaw;
- pitch;
- environment revision/time/weather identifiers;
- Orb state;
- timestamp/version.

Persist only the minimum return snapshot required for continuity. V1 uses session-scoped storage as a crash/route-handoff bridge; it must not become a hidden analytics or long-term location trail.

Never put sensitive memory content or wellness data into route query parameters.

## 11. Camera authority

### HOME_PRESENTATION

- bounded cinematic composition;
- Avatar readable as the user's body without overpowering Orb;
- Orb remains a primary focal relationship;
- enough visible sky exists for its role as a physical interaction surface;
- direct Ground target remains actual terrain;
- responsive framing changes preserve the Avatar-Orb-ground-sky relationship rather than crop one away.

### AVATAR_HOME_FIRST_PERSON

- eye-level terrain-following camera;
- direct viewport is camera-only on desktop/mobile/controller;
- no hands, forearms, torso, legs, feet, weapon/tool rig, or exterior duplicate Avatar;
- pitch range supports looking at sky and ground without vestibularly aggressive rotation;
- first-person FOV tuned per device class, with comfort option;
- the user reads embodiment from camera position, world scale, locomotion, spatial audio, environment response, and origin continuity—not from a fake FPS body rig.

### Ownership

Only one camera system owns the active pose per frame. Transition systems explicitly acquire/release ownership. Concurrent camera writers are a correctness failure.

## 12. First-person body presence

V1 body policy: **camera-only non-XR first person.**

### Desktop / mobile / flat-screen controller

- no visible hands;
- no visible forearms;
- no visible torso;
- no visible legs or feet when looking down;
- no first-person body mesh;
- no FPS-style interaction hands;
- no weapon/tool rig conventions;
- no body part is injected merely to make the view feel “first person.”

The user is embodied by occupying the Avatar's calibrated eye position and moving through the same world. The exterior Avatar ceases direct rendering after the embodiment threshold. This keeps the view clean, cinematic, non-gamey, and free of hand/body clipping artifacts.

Reflections and shadows may represent the Avatar when physically coherent and visually accepted, but they must not create a direct-view body rig or duplicate body in front of the camera.

`AVATAR_SELF_VIEW` is the deliberate mechanism for seeing/inspecting the Avatar while in first-person Home.

### Future XR / VR

XR is the exception because the runtime may have real tracked pose data.

- tracked hands may be visible;
- tracked controllers may be visible;
- articulated arms/body may appear only when driven by sufficiently accurate tracking/IK;
- seated/standing comfort settings apply;
- XR representations remain spatially registered to real input;
- synthetic flat-screen “VR hands” are forbidden outside XR.

This rule applies consistently to Home, Ground, Life Map traversal, ascent/descent, and other non-XR first-person spatial states unless a future canon revision explicitly changes it.

## 13. Environment continuity

Time/weather/environment do not reset during ordinary spatial travel.

Maintain continuity across:

- presentation -> embodiment;
- embodiment -> Ground -> return;
- embodiment -> Life Map -> return;
- Orb conversation -> return.

If the real environment evolves while away, return should reconcile smoothly to the latest environment state rather than jump back to a stale snapshot.

## 14. Accessibility

Semantic equivalence is required, not visual mimicry.

- reduced motion shortens travel but preserves origin/destination meaning;
- keyboard-only users can target Avatar, Ground, Sky, Orb, Self View, and unwind;
- screen-reader controls expose the four Home surfaces without making visible HUD dominant;
- Deaf/hard-of-hearing users receive equivalent visual/haptic state signals;
- low-vision/high-contrast modes do not rely solely on glow or color;
- directional audio never becomes the only navigation cue;
- movement and long camera travel have comfort alternatives;
- assistive focus is restored to the semantic origin after every unwind;
- mobile targets are at least 44x44 CSS px;
- no transition traps focus inside disappearing DOM.

## 15. Failure and interruption rules

All transitions are idempotent and cancellable to a stable state.

| Failure / interruption | Deterministic result |
|---|---|
| ESC during Avatar embodiment | restore exact Home Presentation |
| ESC during Sky ascent before route handoff | return to recorded Home origin |
| ESC during Ground descent before route handoff | return to recorded Home origin |
| double activation | first activation owns transition; subsequent activations ignored |
| browser Back during transition | reconcile through semantic unwind; no duplicate route history |
| tab background / blur | clear movement input; preserve stable state |
| renderer context loss | recover latest stable state or accessible fallback |
| slow/missing destination asset | hold/extend authored transition or fallback; never empty scene |
| audio denied | visual/haptic semantics continue |
| pointer lock denied | drag-look/touch alternative remains usable |
| orientation change | preserve state; recalculate framing |
| controller disconnect | movement stops safely; keyboard/touch remain available |
| stale session snapshot | validate schema and discard safely |

## 16. Performance and loading

- prefetch Ground/Life Map route code and minimum arrival assets before commit where practical;
- keep a bounded transition fallback if destination readiness misses the choreography window;
- no blank canvas between realms;
- device-tier quality scaling may reduce particles, shadow resolution, reflections, and atmospheric samples but must not remove semantic surfaces;
- reduced graphics never replaces the sky with a Life Map button;
- recoverable WebGL loss retains accessible direct navigation;
- non-XR first-person does not spend GPU/animation budget on hidden hand/body meshes.

## 17. Privacy boundaries

Avatar Self View must distinguish:

- presentation data;
- private account/identity data;
- system state;
- memories;
- passive/wellness signals;
- device data.

Only presentation and deliberately approved user-safe state belong by default. Any private/sensitive field requires explicit purpose, provenance, visibility classification, and an accessible privacy control.

## 18. Globalization

- no critical English words baked into visual assets;
- Self View supports text expansion and RTL where applicable;
- date/time/units use locale-aware formatting;
- city/country imagery is visual reference unless the runtime has explicit location authority;
- no visual reference may imply live geolocation or weather if V1 only provides selected/generated environments.

## 19. Failure gallery: do not implement

- floating Life Map portal/ring/door/white dot;
- Ground button or glowing destination hotspot pasted on terrain;
- Avatar missing from Home Presentation;
- exterior Avatar visible in front of camera after embodiment;
- visible hands/forearms/legs/feet in non-XR first-person Home/Ground/Life Map;
- fake FPS-style interaction hands on desktop/mobile/controller;
- third-person Avatar wandering Life Map;
- instant hard cut from Home to unrelated galaxy;
- Orb opens a generic SaaS modal with no physical continuity;
- giant RPG stat grid;
- giant permanent HUD;
- excessive tutorial text;
- ESC always resets to root Home regardless of origin;
- return loses first-person position/orientation;
- two camera systems writing simultaneously;
- duplicate Avatar or duplicate Orb;
- time/weather resets on return;
- Ground behaves as a flat page;
- semantic return depends on browser history alone;
- sensitive Avatar stats stored in route/query strings.

## 20. Runtime state authority

Candidate runtime state contract lives in:

`src/spatial/home/homeExperienceState.ts`

It owns semantic state names and the origin-aware return stack. Existing route/scene stores must be reconciled to this contract rather than independently inventing competing Home modes.

## 21. Gold-master acceptance

Home is not terminally accepted until all of the following are current on one exact head:

- semantic state-machine tests;
- active runtime wiring;
- Home Presentation retained pixels;
- Avatar embodiment storyboard/pixels;
- first-person Home retained pixels with **no non-XR hands/body visible**;
- Self View retained pixels;
- Ground entry + return evidence with **no non-XR hands/body visible**;
- Sky ascent + Life Map return evidence with **no non-XR hands/body visible**;
- Orb transformation + return evidence;
- keyboard/touch/back-stack interaction evidence;
- reduced-motion evidence;
- accessibility/performance evidence;
- no portal/hotspot regressions;
- current independent review where release governance requires it.

No predecessor evidence transfers across a source-changing head.