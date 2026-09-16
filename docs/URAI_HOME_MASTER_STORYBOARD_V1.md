# UrAi Home Master Journey Storyboard V1

This storyboard is the visual/motion handoff for the Home embodiment canon. Each frame is a production acceptance frame, not a loose concept. Runtime names match `src/spatial/home/homeExperienceState.ts`.

**Non-XR first-person rule:** desktop, mobile, and flat-screen controller views are camera-only. No hands, forearms, torso, legs, feet, or first-person body mesh may appear in the direct viewport. Tracked hand/controller representation is reserved for future XR/VR runtime modes.

## A. Master journey: presentation -> embodiment -> self -> Orb -> sky -> Ground -> presentation

### Frame 01 — HOME_PRESENTATION / canonical rest
- Camera: locked cinematic third-person anchor.
- Avatar: visible, back/three-quarter-back to camera, naturally oriented toward the Orb/world.
- Orb: physically grounded and alive, not centered like a button.
- Ground: continuous terrain fills lower frame.
- Sky: broad visible interaction surface.
- UI: no permanent labels over Avatar, Ground, Orb, or Sky.
- Acceptance: the image reads as a place before it reads as navigation.

### Frame 02 — Avatar target acknowledgement
- State remains `HOME_PRESENTATION`.
- User points/taps/gazes at Avatar.
- Avatar response: tiny head/posture awareness, restrained local light response, no outline halo or RPG selection ring.
- Camera does not jump.

### Frame 03 — AVATAR_EMBODIMENT_TRANSITION / commit
- Avatar activated.
- Movement and competing world interactions lock.
- Camera begins leaving the canonical presentation rail toward the Avatar.
- Orb, sky, and terrain remain spatially coherent behind the Avatar.

### Frame 04 — embodiment approach
- Avatar grows in frame because camera physically closes distance.
- No dissolve to an unrelated camera.
- Camera trajectory remains behind/through the Avatar, never around to a face-on portrait.

### Frame 05 — perceptual threshold
- Camera reaches shoulder/head volume.
- Exterior Avatar fades/occludes only at the perceptual crossing where it would otherwise clip.
- Ambient audio perspective moves to the body position.
- Reduced-motion variant performs a short eased convergence with the same semantic threshold.

### Frame 06 — AVATAR_HOME_FIRST_PERSON / arrival
- Camera locks to calibrated first-person eye position.
- No exterior duplicate Avatar in front of user.
- No visible hands/body in non-XR mode.
- Same Orb, same terrain, same weather, same sky, same world coordinates.
- Locomotion unlocks only now.

### Frame 07 — first-person walk
- User moves through Home at calm human pace.
- Viewport remains camera-only: no hands, arms, torso, legs, or feet.
- Subtle contact/footstep audio; no aggressive head bob.
- Ground parallax and nearby geometry establish scale.
- Orb changes apparent scale only because the user is physically approaching it.

### Frame 08 — AVATAR_SELF_VIEW / entry
- User invokes accessible Self View action.
- First-person world softens but remains perceptible.
- One clear self-inspection plane; no giant game HUD.
- Visible groups: Appearance, Identity/Passport link, Embodiment, Journey, Accessibility, Privacy.
- No raw wellness, inferred emotion, memory text, precise location, or device telemetry by default.

### Frame 09 — AVATAR_SELF_VIEW / detail
- User inspects Avatar appearance/presentation and safe journey status.
- Every personal field can expose provenance/privacy classification.
- Scrolling/focus remains accessible and localized.

### Frame 10 — Self View unwind
- ESC/Back closes only Self View.
- Return target: exact `AVATAR_HOME_FIRST_PERSON` pose beneath the overlay.
- Locomotion restores after focus transfer completes.

### Frame 11 — Orb approach
- User walks toward physical Orb.
- Camera-only non-XR view; no first-person hands.
- Orb acknowledges proximity through restrained light/internal motion/audio.
- No floating “CHAT” label.
- Accessible semantic activation exists without visually dominating the world.

### Frame 12 — ORB_TRANSFORMATION
- User activates Orb.
- Camera/Orb relationship tightens.
- Orb’s internal material/particles/light spread into the conversational surface.
- World remains perceptually connected during transformation.

### Frame 13 — IMMERSIVE_CONVERSATION
- Readable modern message stream and composer.
- Voice, send, attachments where authorized.
- Orb remains perceptually present as intelligence state: listening / thinking / speaking / warning / privacy.
- Presentation is UrAi, not a generic modal pasted over Home.

### Frame 14 — ORB_COLLAPSE
- ESC/Back removes conversation layer only.
- Conversation persists.
- Conversational structures collapse visually back toward Orb.
- Return target: first-person Home at prior position/orientation.

### Frame 15 — first-person sky targeting
- User looks upward.
- Camera-only view: sky and world only, no player hands/body.
- The actual sky acknowledges targeting atmospherically: subtle luminance/depth/particle response only.
- Explicitly absent: portal ring, white dot, doorway, floating Life Map button.

### Frame 16 — SKY_ASCENT / launch
- Sky activated.
- First-person camera commits upward from the user’s current location.
- Ground recedes beneath.
- Exterior Avatar does not reappear.
- No non-XR hands/body appear during ascent.

### Frame 17 — SKY_ASCENT / atmosphere
- Clouds, haze, precipitation, light shafts, and spatial wind pass around camera according to current weather.
- Camera-only non-XR view is maintained.
- Home audio attenuates; altitude sound field opens.
- No loading screen.

### Frame 18 — cosmic threshold
- Atmospheric scattering thins continuously.
- Ordinary stars gain depth and structure.
- Memory-space geometry begins to emerge from the same sky.
- No hard cut to an unrelated galaxy.

### Frame 19 — Life Map stable arrival
- Destination authority takes over only after the threshold.
- First-person/explorable personal-universe semantics preserved.
- No exterior Avatar wandering in front of camera.
- No non-XR body rig enters the viewport.

### Frame 20 — LIFE_MAP_UNWIND / ESC
- ESC removes one layer.
- Cosmic structure recedes; star density returns toward ordinary sky.
- Camera begins spatial descent toward recorded Home origin.

### Frame 21 — atmospheric re-entry
- Weather/light state reconciles to the live Home environment.
- Ground/world reappears in expected orientation.
- No reset to presentation camera if origin was first-person.
- View remains camera-only in non-XR mode.

### Frame 22 — AVATAR_HOME_FIRST_PERSON restored
- Exact stable mode restored.
- Approximate X/Z, yaw/pitch, environment revision, and Orb state restored where safe.
- No non-XR hands/body visible.
- User can immediately continue walking.

### Frame 23 — Ground target
- User looks down/selects actual terrain.
- The lower frame shows terrain only; no rendered shoes, legs, feet, or hands in non-XR mode.
- Local material response communicates that the world surface is actionable.
- No Ground button, doorway, ring, or localized portal sculpture.

### Frame 24 — GROUND_DESCENT / commit
- Camera descends into selected/occupied surface.
- Terrain texture/material scale increases.
- Foreground grass/stone/soil/root/water detail grows according to Ground canon.
- Sound and haptic depth increase.
- View remains bodyless/camera-only outside XR.

### Frame 25 — Ground stable arrival
- Ground becomes the active first-person lived world.
- Entry feels spatially related to where user descended.
- No non-XR first-person hands/body rig.

### Frame 26 — GROUND_UNWIND / ESC
- Ground detail/scale reverses into Home terrain.
- Camera rises toward recorded Home origin.
- One-layer unwind only.

### Frame 27 — AVATAR_HOME_FIRST_PERSON restored again
- First-person Home context restored, not cinematic root.
- Camera-only non-XR view is restored exactly.
- User remains free to walk or choose another physical surface.

### Frame 28 — EMBODIMENT_UNWIND / ESC
- User presses ESC with no deeper layer open.
- Locomotion locks.
- Camera leaves eye position and retreats behind/out of Avatar body space.
- Exterior Avatar becomes visible only after camera clears clipping threshold.

### Frame 29 — cinematic restoration
- Camera eases back to exact canonical Home Presentation pose.
- Avatar, Orb, horizon, Ground, and Sky recover intended framing.

### Frame 30 — HOME_PRESENTATION / exact rest
- Same canonical third-person anchor as Frame 01.
- No half-transition residue, duplicate geometry, stale overlay, or wrong camera target.

---

## B. Direct fast path: Home Presentation -> Sky -> Life Map -> Home Presentation

1. `HOME_PRESENTATION` — user activates broad visible sky.
2. `SKY_ASCENT` — camera leaves cinematic anchor into sky; Avatar naturally falls out of frame.
3. atmosphere -> cosmic threshold.
4. Life Map stable.
5. ESC -> `LIFE_MAP_UNWIND`.
6. atmospheric descent.
7. `HOME_RESTORE` -> exact `HOME_PRESENTATION` pose.

Origin is presentation, so return must not invent first-person Home.

## C. Direct fast path: Home Presentation -> Ground -> Home Presentation

1. `HOME_PRESENTATION` — user activates actual world surface.
2. `GROUND_DESCENT` — cinematic camera commits through selected terrain.
3. Ground stable first-person experience.
4. ESC -> `GROUND_UNWIND`.
5. `HOME_RESTORE` -> exact `HOME_PRESENTATION` pose.

No Ground portal/hotspot geometry is introduced for this shortcut.

## D. Direct fast path: Home Presentation -> Orb -> Home Presentation

1. `HOME_PRESENTATION` — Orb activated physically.
2. `ORB_TRANSFORMATION` — Orb expands/transforms into immersive conversation.
3. `IMMERSIVE_CONVERSATION`.
4. ESC -> `ORB_COLLAPSE`.
5. exact `HOME_PRESENTATION` camera restored.

Conversation content persists; presentation layer closes.

---

## E. Camera ownership table

| State / transition | Sole camera owner | Input |
|---|---|---|
| HOME_PRESENTATION | cinematic Home camera | bounded look/target activation |
| AVATAR_EMBODIMENT_TRANSITION | embodiment choreography | locked except cancel |
| AVATAR_HOME_FIRST_PERSON | embodied locomotion camera | movement + look + interact |
| AVATAR_SELF_VIEW | self-view presentation | world locomotion locked |
| GROUND_DESCENT | Ground transition choreography | locked except cancel |
| SKY_ASCENT | ascent choreography | locked except cancel |
| ORB_TRANSFORMATION | Orb conversation choreography | locked except cancel |
| IMMERSIVE_CONVERSATION | conversation presentation camera/shell | chat/voice interaction |
| *_UNWIND / HOME_RESTORE | unwind choreography | locked except emergency recovery |

Two camera owners writing in one frame is an acceptance failure.

---

## F. Motion timing targets

These are initial production targets; retained-pixel/comfort testing may tune within the stated ranges without changing semantics.

| Motion | Normal target | Reduced-motion target |
|---|---:|---:|
| Avatar acknowledge | 180-320 ms | 0-160 ms |
| Avatar embodiment | 1.25-1.75 s | 180-320 ms |
| Embodiment unwind | 1.1-1.6 s | 180-320 ms |
| Orb transform | 0.8-1.25 s | 160-280 ms |
| Orb collapse | 0.65-1.0 s | 140-260 ms |
| Sky ascent Home segment | 1.5-2.2 s before destination threshold continuation | 220-360 ms |
| Ground descent Home segment | 1.3-1.9 s | 200-340 ms |
| Home restore | 0.9-1.4 s | 160-280 ms |

Movement uses eased acceleration/deceleration. No arbitrary bounce, overshoot, shake, or game-like sprint.

---

## G. Audio/haptic storyboard

- Avatar target: almost inaudible presence cue; no UI ding.
- Embodiment threshold: short low-energy spatial convergence; one soft haptic pulse where supported.
- First-person locomotion: material-aware restrained footsteps; no mandatory audio cue for navigation.
- Self View open/close: subtle localized confirmation with visual equivalent.
- Orb proximity: Orb’s internal texture becomes perceptibly attentive.
- Orb engagement: warm confirmation haptic + spatial tonal transition.
- Sky commit: upward spatial swell; wind/atmosphere opens.
- Cosmic threshold: low-intensity widening field, not bombastic sci-fi stinger.
- Life Map arrival: restrained settling cue.
- Ground commit: short low-frequency grounded pulse.
- Ground threshold: denser near-field environmental texture.
- ESC unwind: consistent soft release cue shared across semantic layers.

All haptics are optional and non-essential. Every audio-only meaning has visual/haptic/text accessibility equivalence.

---

## H. Visual failure storyboard frames to capture as explicit WRONG references

1. Home with a white Life Map dot in sky — WRONG.
2. Home with a freestanding portal ring — WRONG.
3. Home with a glowing Ground button/hotspot — WRONG.
4. Home Presentation with no Avatar — WRONG under this successor canon.
5. First-person Home with duplicate Avatar standing in front — WRONG.
6. Non-XR first-person Home/Ground/Life Map showing hands, arms, legs, feet, or an FPS body rig — WRONG.
7. Life Map with third-person Avatar wandering scene — WRONG.
8. Sky click hard-cuts to generic galaxy — WRONG.
9. Orb click opens plain rectangular chatbot modal disconnected from Orb — WRONG.
10. Avatar click opens profile page instead of embodiment — WRONG.
11. Self View shown as RPG strength/agility/XP grid — WRONG.
12. ESC from Life Map entered in first-person resets directly to cinematic Home — WRONG.
13. Returned Home has different weather/time without continuity reconciliation — WRONG.
14. Two camera systems fight/jitter during transition — WRONG.
15. Transition loses keyboard focus or traps screen reader — WRONG.
16. Route refresh returns to half-transitioned state — WRONG.
17. Mobile movement pad overlaps Orb/Self View/back controls — WRONG.

---

## I. Literal-pixel capture set

Gold-master visual evidence must retain at minimum:

- Frame 01 canonical presentation: desktop landscape, mobile portrait.
- Frame 04 Avatar approach midpoint.
- Frame 06 first-person Home arrival, **camera-only/no non-XR hands or body**.
- Frame 08/09 Self View.
- Frame 11 Orb proximity first-person, **camera-only**.
- Frame 12 Orb transform midpoint.
- Frame 13 conversation active.
- Frame 15 sky target first-person, **camera-only**.
- Frame 17 atmospheric ascent, **camera-only**.
- Frame 18 cosmic threshold.
- Frame 19 Life Map stable, **no non-XR body rig**.
- Frame 21 atmospheric re-entry, **camera-only**.
- Frame 22 first-person restored, **camera-only**.
- Frame 23 Ground target, **terrain only in lower frame; no legs/feet/hands**.
- Frame 24 Ground descent midpoint, **camera-only**.
- Frame 25 Ground stable, **camera-only**.
- Frame 28 embodiment unwind midpoint.
- Frame 30 restored cinematic Home.
- direct fast-path return frames for Sky, Ground, and Orb.
- reduced-motion equivalents of embodiment, Sky, Ground, and Orb.
- future XR references must be stored separately from non-XR retained pixels and may show tracked hands/controllers only when XR mode is explicit.

Each retained image must record exact source SHA, viewport, DPR, reduced-motion setting, quality tier, route, stable/transition state, origin context, and whether runtime mode is non-XR or XR.