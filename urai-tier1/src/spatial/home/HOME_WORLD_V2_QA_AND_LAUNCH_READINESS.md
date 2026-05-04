# URAI Home World V2 QA and launch readiness

This document captures the remaining production work after the V2 foundation.

## V2 scope

V2 establishes:

- route-safe home / Life Map / mirror / replay architecture
- HomeWorldState model
- Firestore state fallback
- signal derivation helper
- explainability reasons
- data attributes and CSS variables
- tiered visual fallback system
- horizon mist / symbolic threshold fallback
- reduced-motion support
- transition cleanup
- production asset contract

## Still needed after V2

### 1. Real symbolic intelligence layer

```txt
derive tiers from passive signals
connect mood/recovery/energy to actual Firestore data
connect audio, GPS, habits, social signals, sleep/motion, and life events
generate narrator insights from state changes
log why the world changed
show why-am-I-seeing-this explainability
```

### 2. Production art assets

```txt
final sky tier WebPs
final ground tier WebPs
final orb SVG/Rive states
final avatar silhouettes
final mist/fog overlays
final particle packs
final lighting overlays
final horizon terrain
final symbolic threshold/portal assets
```

### 3. Rive/Lottie implementation

```txt
OrbCompanion_StateMachine.riv
GroundGrowth_Tiers.riv
HomeSky_Idle.riv
SkyToLifeMap_Transition.riv
tier-upgrade-bloom.json
narrator-speaking-shimmer.json
mood weather particle packs
```

### 4. Life Map continuity

```txt
orb beam becomes star tunnel
sky stars stretch into Life Map nodes
first Life Map node appears from the home sky
return transition from Life Map back to home
shared color/state between home and Life Map
shared narrator voice between home and Life Map
```

### 5. Mirror / Replay / Focus completion

```txt
/mirror final Mirror of Becoming scene
/replay final emotional playback chamber
/focus final calm/focus world variant
shared navigation between scenes
scene-to-scene transition language
```

### 6. Companion/narrator presence

```txt
orb emotional expressions
narrator speaking shimmer
soft subtitles
TTS state hooks
companion idle reactions
companion not-intrusive insight moments
companion memory/personality tone
```

### 7. Tier upgrade ceremonies

```txt
Tier 1->2 first recovery sprout
Tier 2->3 root awakening
Tier 3->4 bloom path opening
Tier 4->5 constellation ecosystem awakening
upgrade sound/haptic moment
shareable your-world-awakened card
```

### 8. Privacy and consent UX

```txt
privacy controls for what influences the world
data source toggles
local-only mode indicators
this-changed-because-of-these-signals panel
no scary mental-health wording
safe crisis-language guardrails
```

### 9. Mobile and device QA

```txt
iPhone small screen QA
large desktop QA
tablet QA
Android Chrome QA
Safari animation QA
low-power mode behavior
slow GPU fallback
safe-area polish
touch gestures
orientation handling
```

### 10. Performance optimization

```txt
asset lazy loading
image compression
Rive/Lottie lazy mount
particle count scaling
CSS containment
GPU layer budgeting
reduced-motion and low-power fallbacks
bundle size audit
```

### 11. Testing and CI

```txt
Playwright screenshot tests
tier visual regression tests
route transition tests
Firebase fallback tests
offline fallback tests
accessibility tests
mobile viewport tests
performance budget checks
```

### 12. Launch/demo packaging

```txt
demo user state seed
public demo mode
waitlist capture
shareable screenshots/cards
onboarding into the world
press/demo copy
founder walkthrough script
known issues doc
deployment checklist
```

## Additional engineering checks added from audit

```txt
route consistency
mirror/replay route existence
asset script correctness
accessibility
performance budget
visual regression testing
design tokens
z-index contract
auth/user source
tier derivation logic
loading/error/offline fallbacks
sound/haptics
avatar progression
definition of done
```

## Definition of done

A user should be able to look at the home screen for three seconds and understand:

1. This is a world, not a dashboard.
2. The orb is alive.
3. The ground represents growth/recovery.
4. The sky represents emotional weather.
5. The horizon leads somewhere.
6. Their world can evolve over time.

## Version sequence

```txt
V2 = route-safe, data-driven, tiered symbolic foundation
V3 = real data intelligence + final art assets
V4 = cinematic transitions + companion/narrator polish
V5 = QA, performance, privacy, and public demo launch
```
