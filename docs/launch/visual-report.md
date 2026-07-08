# URAI Spatial Visual Report

Generated: 2026-07-08T01:25:00Z  
Branch: `asset-safe-launch-pack`

## Important note

This visual report is based on:

1. Repository inspection through GitHub.
2. Operator-provided Cloud Shell logs.
3. Operator-provided screenshots from `/`, `/home`, `/life-map`, `/focus`, and `/replay`.

The GitHub connector cannot capture live desktop/mobile screenshots. The screenshot capture fields below must be completed after the Cloud Shell/browser capture loop.

## Visual scoring rubric

Scale:

- 10 = launch-grade cinematic unified world
- 8 = acceptable launch-grade surface with minor polish needed
- 6 = working but still visibly prototype or disconnected
- 4 = concept present but not launch-grade
- 2 = broken or wrong product metaphor

## Current visual route grades

| Route | Current score | Basis | Primary defect |
| --- | ---: | --- | --- |
| `/` | 6.8 | Operator screenshots after runtime asset wiring | Home is functional and improved, but still not as premium as Life Map/Focus/Replay. Needs post-correction screenshot verification. |
| `/home` | 6.8 | Same Home runtime surface | Same as `/`; first-frame composition is the key risk. |
| `/spatial/ar-vr` | TBD | Not captured in latest loop | Needs desktop/mobile screenshot. |
| `/life-map` | 8.0 | Operator screenshot | Strong galaxy/sky layer; route/nav UI still slightly non-diegetic. |
| `/ground` | 5.8 | Repo inspection and prior screenshots | Still separate route/component, not obviously descended from Home. |
| `/focus` | 8.2 | Operator screenshot | Strong selected-star chamber; should remain contextual from Life Map. |
| `/replay` | 8.2 | Operator screenshot | Strong cinematic memory film; should be framed as inside selected star. |
| `/passport` | TBD | Not captured in latest loop | Must read as spatial room/layer, not admin page. |
| `/status` | TBD | Not captured in latest loop | Must read as spatial beacon/control layer, not admin page. |

## Route-by-route notes

### Home / `/` / `/home`

Before latest correction pass:

- Good: app loads, GLB crash fixed, Home copy says URAI world hub, portal rings visible.
- Defect: lower Ground asset and Passport/Status candidate were too close and blocky in foreground.
- Fix landed: Ground moved deeper, Passport/Status hidden from default Home, portal rings repositioned.

Required verification:

- Reopen `/?homecomposition=1` and `/home?homecomposition=1`.
- Confirm the giant foreground block/pillar is gone.
- Confirm Ground feels below/reachable, not jammed into camera.
- Confirm Home chamber remains the main visual focus.

### Life Map

Current screenshot shows a strong galaxy/memory sky layer. It is visually closer to launch-grade than Home.

Remaining risks:

- Route bar reads as web navigation.
- Selected star interaction is strong but should feel explicitly like Focus entry from within the same world.

### Focus

Current screenshot is strong: selected memory chamber, star object, cinematic lighting, clear entry into memory.

Remaining risks:

- Direct `/focus` route should be treated as shareable deep link, not primary nav destination.
- Needs transition choreography proof from Life Map star selection.

### Replay

Current screenshot is strong cinematic memory film.

Remaining risks:

- Needs clearer continuity from Focus into Replay.
- Direct route should be shareable deep link, not global first-class nav.

### Ground

Ground remains the weakest conceptual continuity route.

Remaining risks:

- It reads as a separate private operations floor rather than a descended layer below Home.
- Needs spatial shell/bridge or stronger descent entry from Home.

## Required screenshot table

Fill after capture:

| Route | Desktop screenshot | Mobile screenshot | Score after correction | Pass? |
| --- | --- | --- | ---: | --- |
| `/` | pending | pending | pending | pending |
| `/home` | pending | pending | pending | pending |
| `/spatial/ar-vr` | pending | pending | pending | pending |
| `/life-map` | pending | pending | pending | pending |
| `/ground` | pending | pending | pending | pending |
| `/focus` | pending | pending | pending | pending |
| `/replay` | pending | pending | pending | pending |
| `/passport` | pending | pending | pending | pending |
| `/status` | pending | pending | pending | pending |

## Acceptance statement

Current branch is not visually locked yet.

It is build-valid and materially improved, but the unified-world launch lock requires fresh screenshot proof after the latest Home composition correction and at least one repair pass for Ground continuity.
