# URAI Shared World Architecture

## Decision

URAI Spatial is one continuous world. Home, Ground, Life Map, Focus, Replay, Passport, and Status are states or layers inside that world, not unrelated visual pages.

Focus and Replay are contextual memory states after Life Map star selection. They are not long-term first-class global navigation destinations.

Existing route components remain in place during migration. They are placeholders until safely moved into `URAIWorldShell`.

## Route strategy

Routes remain shareable, but each route should eventually render the shared world shell with an initial mode:

- `/` and `/home` -> `homeIdle`
- `/ground` -> `groundActive`
- `/life-map` -> `lifeMapActive`
- `/focus` -> `focusActive`
- `/replay` -> `replayActive`
- `/passport` -> `passportActive`
- `/status` -> `statusActive`

## World modes

- `homeBooting`
- `homeIdle`
- `enteringGround`
- `groundActive`
- `enteringLifeMap`
- `lifeMapActive`
- `starSelected`
- `enteringFocus`
- `focusActive`
- `enteringReplay`
- `replayActive`
- `passportActive`
- `statusActive`
- `returningHome`

## Asset slots

Minimum slot list:

- `home.overlookPlatform`
- `home.skylineCore`
- `home.groundAperture`
- `home.lifeMapAperture`
- `ground.lowerWorldLayer`
- `ground.actionNodes`
- `lifeMap.galaxyDome`
- `lifeMap.memoryStars`
- `lifeMap.constellationLines`
- `focus.starPortalShell`
- `focus.memoryDiorama`
- `replay.memoryThreadTunnel`
- `replay.beatMarkers`
- `passport.identityVault`
- `status.beaconTower`

## Fallback strategy

`AssetSlot` renders its fallback and exposes:

- `data-asset-slot`
- `data-asset-final-model`
- `data-asset-status="placeholder"`

This pass does not pretend final GLBs exist. Missing GLBs must not crash the app.

## Phased migration plan

1. Land world mode types, asset manifest, `AssetSlot`, and `URAIWorldShell` scaffold.
2. Keep existing routes working.
3. Migrate `/` and `/home` into `URAIWorldShell` first.
4. Migrate Ground as the physical lower layer.
5. Migrate Life Map as the sky layer.
6. Make Focus and Replay contextual selected-star states.
7. Add Passport vault and Status beacon layers.
8. Replace placeholders with final GLBs slot by slot.

## Acceptance checklist

- Every major placeholder has a named asset slot.
- Final model paths are declared.
- Missing GLBs fall back safely.
- Routes are not deleted during migration.
- Focus and Replay are treated as contextual states long-term.
- Typecheck and build remain green after each small migration.
