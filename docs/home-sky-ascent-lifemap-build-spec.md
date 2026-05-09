# Home Click -> Sky Ascent -> Life Map Build Spec

This spec locks the Home click -> sky ascent -> Life Map transition as a signature URAI Spatial product moment. It is not a generic animation, loading screen, or decorative 3D gimmick. The transition must preserve the emotional meaning of Home while moving the user into a larger memory atlas.

Source creative direction: the product moment should feel like Home becoming sky, sky becoming constellation, and constellation becoming memory map. The user-provided direction requires exact transition states, timings, camera coordinates, easing curves, React/Three.js structure, reduced-motion fallback, low-end fallback, and a QA checklist.

## North Star

Clicking from Home means: I am ready to zoom out from the present and see my life as a living system.

The transition has three emotional beats:

1. Safety: Home remains the grounded personal sanctuary.
2. Lift: the user rises out of the local Home scene into a higher-order spatial view.
3. Recognition: the Life Map resolves as personal memory structure, not random stars.

The implementation target is not player flies through a sci-fi portal tunnel. The target is: the home orb awakens, the moonlit platform seals unlock, and the player ascends through sacred spatial geometry into the Life Map.

## Factory preset names

Use these names across asset generation, implementation notes, QA, and PR comments:

```txt
urai_home_to_sky_ascent_transition
urai_ascent_portal_sacred_geometry
urai_life_map_celestial_arrival
urai_orb_continuity_anchor
urai_moonlit_platform_reflection_system
```

## Implementation-facing asset presets

### urai_home_to_sky_ascent_transition

Create the Home -> Sky Ascent transition for URAI Spatial in the moonlit sacred-tech visual standard.

The transition begins from the central orb on the Home screen. The orb awakens softly with pale cyan inner light and subtle white-gold highlights. Reflections ripple across the dark glass-stone platform. Thin moonlit silver orbital glyphs, crescent arcs, and sealed ritual geometry appear around the orb.

The camera rises slowly through soft mist, haze, and volumetric moonlight. The movement should feel like quiet legendary ascension, not a fast warp tunnel. The orb remains the continuity anchor through the transition, either centered, reflected below, or echoed through circular sacred geometry.

Use deep navy, blue-violet, moonlit silver, pale cyan, soft white-gold, and dark reflective black-stone. Keep particles sparse, glow restrained, and empty space strong.

Avoid saturated neon portal rings, sci-fi tunnel visuals, heavy particle rush, chaotic lightning, fast warp energy, or generic cyber portal effects.

The emotional target is: the home orb awakens, the platform unlocks, and the player ascends through sacred spatial geometry.

### urai_ascent_portal_sacred_geometry

Refine the URAI Spatial AscentPortal so it reads as sealed moonlit ritual geometry rather than a generic sci-fi portal.

The portal should use thin orbital rings, crescent arcs, faint runic seals, glass-like refraction, mist layers, and soft volumetric moonbeams. Rings should be low-opacity, elegant, and moonlit silver with restrained pale cyan highlights. Add subtle white-gold accents only at focal points.

The visual should feel sacred-tech, premium, spatial, and quietly legendary. Motion should be slow, graceful, and atmospheric.

Reduce:

```ts
cyanIntensity
ringOpacity
particleCount
tunnelDepth
fastMovement
heavyBloom
saturatedGlow
```

Increase:

```ts
moonlitSilverLinework
softWhiteGoldAccents
orbReflection
mistDepth
volumetricMoonlight
sparseRuneGeometry
reflectiveGlassStoneContinuity
```

The result should feel like an ancient-futuristic ascension seal opening around the orb, not a laser portal or warp tunnel.

### urai_life_map_celestial_arrival

Create the Life Map arrival moment for URAI Spatial.

The player emerges from the Sky Ascent into a celestial spatial map suspended in a moonlit cosmic environment. The Life Map should feel like a sacred constellation chart: elegant nodes, thin orbital paths, soft glass panels, moonlit silver lines, pale cyan highlights, and subtle white-gold focal accents.

The central orb remains present as the continuity anchor, either as the map core, a reflected artifact, or a guiding celestial node.

The environment should preserve the moonlit orb-platform identity: deep navy sky, blue-violet atmosphere, mist, haze, soft volumetric light, reflective dark glass-stone surfaces, and restrained sacred energy.

The arrival should feel quiet, premium, and legendary - like discovering a celestial system - not like entering a loud sci-fi dashboard.

### urai_orb_continuity_anchor

The orb is the continuity object across Home, Ascent, and Life Map.

In Home, it is the collectible focal artifact. During Ascent, it awakens and activates sealed orbital geometry. In Life Map, it should remain present as the map core, a reflected artifact, or a guiding celestial node.

The orb must never disappear in a way that makes the route transition feel like a page swap. If the orb is no longer physically visible, its circular glyphs, reflection, or pale-cyan/white-gold glow language must carry continuity into the next scene.

### urai_moonlit_platform_reflection_system

The platform reflection system ties the product world together.

Use reflective dark glass-stone surfaces, soft white-gold ripple reflections, pale cyan orb falloff, and mist crossing the floor plane. Reflections should be quiet and premium, not watery, noisy, or exaggerated.

The reflection is not decoration. It shows that the orb, platform, and Life Map occupy one continuous spatial world.

## Exact transition states

| State | Owner | Purpose | User control |
| --- | --- | --- | --- |
| `home` | `HomeScene` | Calm personal center with orb, sky, ground, and ritual platform | Sky/orb click can enter Ascent |
| `ascentPreparing` | Visual phase inside `/ascent` | First 0-300ms commit/inhale moment | Duplicate input ignored |
| `ascentEntering` | Visual phase inside `/ascent` | 300-900ms lift from Home into sky | Pointer motion allowed, scene controls disabled |
| `ascentRitualGeometry` | Visual phase inside `/ascent` | 900-1550ms sacred spatial geometry passage with controlled parallax | Drag/orbit disabled |
| `ascentRevealing` | Visual phase inside `/ascent` | 1550-2050ms constellation/memory seed reveal | Controls still withheld |
| `lifemapReady` | `/life-map` | Life Map route is interactive | Node selection and guidance controls enabled |
| `reducedMotionAscent` | `/ascent` reduced-motion path | Static dissolve, no tunnel or camera flight | Manual Enter Life Map button available |
| `ascentError` | Fallback only | Safe recovery if map data or routing fails | Return Home / Retry |

The current implementation maps the route-level state to `/ascent` and uses deterministic phase timing inside `AscentPortal.tsx`. The route auto-advances to `/life-map` after the ascent duration.

## Timing table

| Window | Duration | Visual phase | Easing | Intent |
| --- | ---: | --- | --- | --- |
| 0-300ms | 300ms | Commit / inhale | `easeOutCubic` | The orb and scene acknowledge the click |
| 300-900ms | 600ms | Lift | `easeInOutCubic` | Home falls away without a snap |
| 900-1550ms | 650ms | Sacred geometry passage | `easeInOutCubic` | Sky becomes memory field through restrained ritual geometry, not a tunnel |
| 1550-2050ms | 500ms | Constellation ignition | `easeOutExpo` / single bloom peak | Memory seeds appear and portal resolves |
| 2050-2240ms | 190ms | Settle | `easeOutCubic` | Motion quiets before Life Map control returns |

Recommended total duration: `2240ms`. Repeated use should never feel punitive. If runtime route timing must remain shorter for lock reasons, preserve the same proportions and reduce spectacle first.

## Suggested camera coordinates

Home start:

```ts
position: [0, 2.55, 7.85]
target: [0, -0.18, -2.7]
fov: 48
```

Ascent route:

```ts
position: [0, 5.55, 5.15]
target: [0, 2.35, -6.6]
fov: 51
```

Life Map overview:

```ts
position: [0, 3.8, 9.5]
target: [0, 0.6, 0]
fov: 46-51 depending on viewport
```

Rules:

- The camera must arc upward; it must not feel like a vertical elevator.
- Roll must remain almost invisible. No spin.
- Drift during Ascent should be substantially lower than Home idle drift.
- Reduced motion must snap to stable composition through opacity/scale, not camera travel.

## Easing curves

Use cubic/expo curves only. Do not use spring, bounce, physics inertia, or random camera noise.

```ts
function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function easeOutExpo(value: number) {
  return value === 1 ? 1 : 1 - Math.pow(2, -10 * value)
}
```

## React / Three.js component structure

Canonical runtime path:

```txt
Next.js route
  -> TierOneExperience
  -> HomeScene
  -> R3F Canvas
  -> CinematicCameraRig
  -> Sky / Atmosphere / Ground / Orb / AscentPortal / ConstellationLayer
```

Ascent-specific ownership:

```txt
src/scene/AscentPortal.tsx
  -> PortalCore
  -> OrbitalSeal
  -> PlatformReflection
  -> MistVeil
  -> Moonbeam
  -> AscentStars
  -> MemorySeedNodes
```

Camera ownership:

```txt
src/spatial/cinematic/cameraPaths.ts
  -> cameraPathPresets.ascent
  -> cameraPathForState(sceneMode === 'ascent')

src/spatial/cinematic/CinematicCameraRig.tsx
  -> consumes `ascent` preset
  -> preserves deterministic camera bounds and reduced-motion behavior
```

Do not create a second scene authority. Do not move state ownership out of `HomeScene` for this visual pass.

## Pseudocode for transition state machine

```ts
type RouteMode = 'home' | 'ascent' | 'life-map' | 'focus' | 'replay' | 'mirror'

type AscentVisualPhase =
  | 'idle'
  | 'ascentPreparing'
  | 'ascentEntering'
  | 'ascentRitualGeometry'
  | 'ascentRevealing'
  | 'lifemapReady'
  | 'reducedMotionAscent'
  | 'ascentError'

function enterLifeMap() {
  if (routeMode === 'home') router.push('/ascent')
  if (routeMode === 'ascent') router.push('/life-map')
}

function resolveAscentPhase(elapsedMs: number, reducedMotion: boolean): AscentVisualPhase {
  if (reducedMotion) return 'reducedMotionAscent'
  if (elapsedMs < 300) return 'ascentPreparing'
  if (elapsedMs < 900) return 'ascentEntering'
  if (elapsedMs < 1550) return 'ascentRitualGeometry'
  if (elapsedMs < 2050) return 'ascentRevealing'
  return 'lifemapReady'
}

useEffect(() => {
  if (routeMode !== 'ascent') return
  if (reducedMotion) return

  const timeout = window.setTimeout(() => {
    router.push('/life-map')
  }, ASCENT_DURATION_MS)

  return () => window.clearTimeout(timeout)
}, [routeMode, reducedMotion, router])
```

## Reduced-motion fallback

Reduced motion is not a broken version. It is a premium static dissolve.

Required behavior:

- No tunnel travel.
- No camera flight.
- No continuous particle rush.
- Home dims.
- Orb/portal glow rises once.
- Life Map can be entered manually through the visible guidance button.
- User must never be trapped in `/ascent`.

## Low-end device fallback

If quality detection is added later, degrade in this order:

1. Reduce star count by 60-80%.
2. Disable additive bloom-like opacity peaks.
3. Reduce orbital seals from 6 to 4.
4. Disable memory seed node reveal until `/life-map`.
5. Keep camera preset and route timing intact.

Never degrade by making Home flash, showing a spinner as the primary visual, or rendering a half-loaded Life Map behind the portal.

## QA checklist for designers

- Home still feels calm and important before click.
- Click feels like commitment, not navigation chrome.
- Ascent does not feel like a video game launch.
- No hyperspace tunnel, no excessive bloom, no fast spin.
- Orb/portal remains the continuity anchor.
- Memory seeds appear progressively, not all at once.
- Life Map feels earned and personal.
- Transition is short enough for repeated use.
- Reduced-motion path feels intentionally designed.

## QA checklist for engineers

- `/home` and `/` render Home.
- Home click routes to `/ascent`.
- `/ascent` renders `AscentPortal`.
- `/ascent` auto-advances to `/life-map` for non-reduced-motion users.
- Reduced-motion users get a manual Enter Life Map action.
- Escape during Ascent is safe.
- No duplicate route pushes on repeated click.
- `cameraPathForState({ sceneMode: 'ascent' })` returns `ascent`.
- `pnpm --filter urai-tier1 typecheck` passes.
- `pnpm --filter urai-tier1 build` passes.
- No new dependencies were introduced.
- No Firestore, replay, focus, or manifest contracts changed.

## Engineering quality gate for the PR

```txt
Does AscentPortal still look like a generic portal ring?
Are cyan and purple too saturated?
Are there too many particles?
Does the transition preserve the orb as the anchor?
Does the motion feel slow, sacred, and premium?
Does the Life Map feel like a celestial chart rather than a dashboard?
Do the Home, Ascent, and Life Map screens feel like one continuous world?
```

The next refinement should not add more spectacle. It should add restraint, continuity, reflection, and sacred geometry.

## Anti-gimmick guardrails

This transition fails if it feels like any of the following:

- A loading screen with nice particles.
- A sci-fi portal pasted onto a quiet product.
- A game warp effect.
- A route change disguised with bloom.
- A visual flex that makes the Life Map less understandable.

The correct result is restrained, emotionally clear, deterministic, and usable.
