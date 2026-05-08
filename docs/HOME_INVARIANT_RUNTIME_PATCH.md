# Home Invariant Runtime Patch

This patch is the remaining runtime step for the standalone URAI Spatial release gate.

## Goal

Pure Home must be sky-first and silent: no visible text, buttons, nav, onboarding, narrator, HUD, route card, debug UI, or companion overlay.

## Canonical route authority

The canonical Home route is:

```tsx
<TierOneExperience mode="home" />
```

The canonical runtime path is:

```txt
urai-tier1/src/app/page.tsx
  -> urai-tier1/src/spatial/layout/TierOneExperience.tsx
  -> urai-tier1/src/scene/HomeScene.tsx
```

## Minimal HomeScene changes still required

In `urai-tier1/src/scene/HomeScene.tsx`:

1. `ModeGuidance` must return `null` when `mode === 'home'`.
2. The visible `data-testid="urai-sky-click-target"` button must not render on Home. Preserve Home entry through a non-visible stage/canvas pointer path.
3. `showOrb` must exclude pure Home.
4. `<NarratorVoice />` must not render on pure Home.
5. `<NarratorHud />` must not render on pure Home.
6. `<CameraResetButton />` must not render on pure Home.
7. Keyboard reset with `r` should be disabled on pure Home.

## Preserve

Do not remove:

- `data-scene-mode={sceneMode}`
- spatial visuals: `Sky`, `Atmosphere`, `CelestialSanctuary`, `Ground`, `RitualPlatform`, `Lanterns`
- click/pointer entry from Home to `/ascent`
- reduced-motion behavior after `/ascent`
- Life Map, Focus, Replay, and Mirror route behavior

## Expected outcome

After the runtime patch, these commands should be able to advance to the next blocker instead of failing Home invariant immediately:

```bash
pnpm home:invariant
pnpm lock:static
pnpm verify:release:full
```

Do not update `URAI_SPATIAL_TIER_LOCK_AUDIT.md` to a locked verdict until the full release gate and manual visual review pass.
