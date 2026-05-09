# Home Click -> Sky Ascent -> Life Map Build Spec

This spec locks the Home click -> sky ascent -> Life Map transition as a signature URAI Spatial product moment. It is not a generic animation, loading screen, or decorative 3D gimmick. The transition must preserve the emotional meaning of Home while moving the user into a larger memory atlas.

Source creative direction: the product moment should feel like Home becoming sky, sky becoming constellation, and constellation becoming memory map. The user-provided direction requires exact transition states, timings, camera coordinates, easing curves, React/Three.js structure, reduced-motion fallback, low-end fallback, and a QA checklist.

## North Star

Clicking from Home means: I am ready to zoom out from the present and see my life as a living system.

The transition has three emotional beats:

1. Safety: Home remains the grounded personal sanctuary.
2. Lift: the user rises out of the local Home scene into a higher-order spatial view.
3. Recognition: the Life Map resolves as personal memory structure, not random stars.

## Exact transition states

| State | Owner | Purpose | User control |
| --- | --- | --- | --- |
| `home` | `HomeScene` | Calm personal center with orb, sky, ground, and ritual platform | Sky/orb click can enter Ascent |
| `ascentPreparing` | Visual phase inside `/ascent` | First 0-300ms commit/inhale moment | Duplicate input ignored |
| `ascentEntering` | Visual phase inside `/ascent` | 300-900ms lift from Home into sky | Pointer motion allowed, scene controls disabled |
| `ascentTunneling` | Visual phase inside `/ascent` | 900-1550ms atmospheric passage with controlled parallax | Drag/orbit disabled |
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
| 900-1550ms | 650ms | Atmospheric passage | `easeInOutCubic` | Sky becomes memory field through restrained parallax |
| 1550-2050ms | 500ms | Constellation ignition | `easeOutExpo` / single bloom peak | Memory seeds appear and portal resolves |
| 2050-2240ms | 190ms | Settle | `easeOutCubic` | Motion quiets before Life Map control returns |

Recommended total duration: `2240ms`. Repeated use should never feel punitive. If runtime route timing must remain shorter for lock reasons, preserve the same proportions and reduce the tunnel phase first.

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
  -> PortalRing
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
  | 'ascentTunneling'
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
  if (elapsedMs < 1550) return 'ascentTunneling'
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
3. Reduce rings from 7 to 4.
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

## Anti-gimmick guardrails

This transition fails if it feels like any of the following:

- A loading screen with nice particles.
- A sci-fi portal pasted onto a quiet product.
- A game warp effect.
- A route change disguised with bloom.
- A visual flex that makes the Life Map less understandable.

The correct result is restrained, emotionally clear, deterministic, and usable.
