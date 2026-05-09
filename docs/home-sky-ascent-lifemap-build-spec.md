# URAI Spatial Home -> Sky Ascent -> Life Map Build Spec

## North Star

The Home -> Sky Ascent -> Life Map transition is URAI Spatial's signature emotional transition. The home orb awakens, the moonlit platform responds, sealed sacred geometry opens, and the user ascends into their Life Map. It must feel cinematic, moonlit, restrained, sacred-tech, spatial, collectible, premium, and quietly legendary.

It must not feel like a sci-fi portal tunnel, warp-speed loading screen, noisy neon effect, or decorative 3D gimmick.

## Canonical component structure

- Route shell: `src/spatial/layout/TierOneExperience.tsx`
- Scene authority: `src/scene/HomeScene.tsx`
- Home world: `Ground`, `RitualPlatform`, `Lanterns`, `CelestialSanctuary`, `Sky`, `Atmosphere`
- Ascent transition geometry: `src/scene/AscentPortal.tsx`
- DOM visual overlay: `src/scene/SpatialVisualOverlayPremium.tsx`
- Camera director: `src/spatial/cinematic/CinematicCameraRig.tsx`
- Camera presets: `src/spatial/cinematic/cameraPaths.ts`
- Life Map constellation: `src/spatial/constellation/ConstellationLayer.tsx`
- Transition state contract: `src/spatial/scene/ascentState.ts`

Do not introduce a second runtime scene authority. The canonical flow remains:

```txt
/ or /home -> /ascent -> /life-map -> /focus -> /replay -> /mirror
```

## Transition states

Animation state and data state are intentionally separate.

```ts
type AscentPhase =
  | 'idle'
  | 'ascentPreparing'
  | 'ascentEntering'
  | 'ascentTunneling'
  | 'ascentRevealing'
  | 'lifemapHydrating'
  | 'lifemapReady'
  | 'ascentError'
  | 'reducedMotionAscent'

type LifeMapDataStatus =
  | 'notRequested'
  | 'preloading'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
```

## Timing table

| Window | Phase | Product read | Implementation guidance |
|---:|---|---|---|
| 0-300ms | `ascentPreparing` | Commit / inhale | CTA compresses, orb inhales, platform emits one restrained ripple. |
| 300-900ms | `ascentEntering` | Lift | Camera begins upward/forward arc. Home remains faintly visible. |
| 900-1550ms | `ascentTunneling` | Atmospheric passage | Mist, moonbeams, sparse depth particles, crescent seals. Avoid tunnel language visually. |
| 1550-2050ms | `ascentRevealing` | Constellation ignition | Orb peaks once, memory nodes and relationship lines resolve progressively. |
| 2050-2240ms | `lifemapReady` | Arrival | Camera settles, controls return only when Life Map is ready. |

Target duration: `2240ms`. Acceptable range: `1800-2800ms` when route or data constraints require it.

## Camera coordinates

Camera movement uses `cameraPaths.ts` and `CinematicCameraRig`; use curved path presets rather than hard camera snaps.

| Moment | Position | Look at |
|---|---:|---:|
| Home | `[0, 2.2, 7.5]` | `[0, 1.1, 0]` |
| Lift midpoint | `[0, 5.5, 5.2]` | `[0, 2.4, 0]` |
| Ascent passage | `[0, 7.0, 4.2]` | `[0, 3.6, 0]` |
| Life Map arrival | `[0, 3.8, 9.5]` | `[0, 0.6, 0]` |

Avoid camera spin, hard snaps, and straight elevator motion.

## Easing

- Commit: `cubic-bezier(0.2, 0.0, 0.0, 1.0)`
- Lift: `easeInOutCubic`
- Reveal / settle: `cubic-bezier(0.16, 1, 0.3, 1)`

Do not use bouncy cartoon easing.

## Visual language tokens

Colors:

- Deep navy
- Blue-violet
- Moonlit silver
- Pale cyan
- Soft white-gold
- Dark reflective black-stone

Effects:

- Restrained bloom
- Soft mist
- Thin orbital glyphs
- Crescent arcs
- Glass refraction
- Platform reflection
- Subtle star nodes
- Faint relationship lines

Cyan intensity stays low. White-gold is a premium accent, not a floodlight.

## State machine pseudocode

```ts
onHomeCommit():
  if currentMode !== 'home' or ascentInFlight: return
  mark ascentInFlight
  set dataStatus = 'preloading'
  route('/ascent')

onAscentTick(elapsedMs, dataStatus, reducedMotion):
  phase = resolveAscentPhase({ elapsedMs, dataStatus, reducedMotion })

  if phase === 'ascentError':
    show calm recovery copy
    keep duplicate clicks disabled
    return

  if phase === 'lifemapHydrating':
    hold calm moonlit hydration state
    do not show raw spinner
    return

  if shouldAdvanceToLifeMap(phase):
    route('/life-map')

onLifeMapReady():
  enable node selection
  enable recenter controls
  reveal labels progressively
```

## Interaction rules

During ascent:

- Ignore duplicate Home / Life Map clicks.
- Disable map selection, drag/orbit, and recenter controls.
- Keep browser back graceful: `/ascent` can unwind home via Escape/back.
- Never expose raw debug phase text to users.

After `lifemapReady`:

- Enable Life Map controls.
- Reveal memory labels after structure resolves.
- Keep the orb as continuity anchor from Home to Ascent to Life Map.

## Reduced motion path

Reduced motion is a designed dissolve, not a broken transition:

- No camera tunnel.
- No flying through space.
- No aggressive parallax.
- Home softens, orb glows, constellation fades in.
- Camera changes minimally or not at all.
- User can continue into Life Map through explicit UI if auto-advance is suppressed.

## Low-end / mobile fallback

- Keep particle budgets low; ascent mist should remain sparse.
- Prefer static layered gradients over expensive volumetric effects.
- Reduce blur/filter animation on small screens or reduced-motion devices.
- Preserve readable UI-safe zones.
- Avoid per-frame DOM layout work.

## QA checklist

- `pnpm run typecheck` passes.
- `pnpm run build` passes.
- `pnpm run lint` passes if available.
- No duplicate Home click bug.
- Transition completes when data is fast.
- Transition holds calmly when data is slow.
- Data error / empty state is handled without raw debug text.
- Reduced-motion path works and feels designed.
- Mobile layout remains readable.
- UI controls are disabled during ascent and restored after arrival.
- No hard neon portal look.
- No excessive particles.
- Home and Life Map remain recognizable.

## What to avoid

- Generic sci-fi portal tunnel.
- Flashy warp-speed effect.
- Cheap neon.
- Cluttered particles.
- Generic fantasy RPG styling.
- Oversaturated cyan/purple.
- Giant badges.
- Mobile-ad-style CTA treatment.
- Excessive bloom.
- Unreadable UI.
- Decorative 3D gimmicks that do not serve the product moment.
