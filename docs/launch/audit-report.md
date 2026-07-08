# URAI Spatial Launch Audit Report

Generated: 2026-07-08T01:25:00Z  
Branch: `asset-safe-launch-pack`  
PR: #463 `Asset-safe V1 launch pack`

## Scope

This receipt covers the current launch-audit loop for the spatial routes and surfaces that must behave as one URAI world:

- `/`
- `/home`
- `/spatial/ar-vr`
- `/life-map`
- `/ground`
- `/focus`
- `/replay`
- `/passport`
- `/status`

## Current grounded repo findings

### Home / root

`src/app/page.tsx` routes `/` directly into `SpatialWorldCanvas mode="home"`. This is the current active default spatial world entry.

`/home` routes through `src/app/home/page.tsx`, which renders `SpatialDefaultWorld`.

Recent corrections on this branch:

- Runtime asset wiring committed for generated V1 GLB/HDR candidates.
- Home GLB regenerated as valid binary GLB.
- Home HUD copy changed from demo wording to URAI Spatial Home language.
- Ground candidate moved farther below/back.
- Passport/Status candidate hidden from default Home.
- Home portal anchors repositioned for descent/ascent/side-room reads.

### Life Map

`src/app/life-map/page.tsx` renders `RealLifeMapGalaxy` and styles a galaxy/star selection interface. This route visually reads strongest from current operator screenshots, but it still has route-bar/global-nav language that can break the pure continuous-world illusion.

### Ground

`src/app/ground/page.tsx` is still an independent route surface with `groundFinal`, separate cards/stations, and a private operations floor metaphor. It is visually aligned with Ground concept, but not yet fully migrated into the shared 3D world shell.

### Focus

`src/app/focus/page.tsx` renders `FinalFocusChamber`; current screenshots show this as a strong selected-star memory chamber. This surface is visually ahead of Home but should remain contextual from Life Map star selection long-term.

### Replay

`src/app/replay/page.tsx` renders `CinematicReplayClient` with a route proof surface. Current screenshots show a cinematic memory film layer that visually works, but it still exists as a direct route and should be framed as inside the selected star.

### Passport / Status

Passport and Status are present as launch routes, but long-term product rule says they must become spatial rooms/layers inside the world, not admin pages.

## Verification already observed in Cloud Shell

Operator-provided Cloud Shell logs show:

- `pnpm --dir urai-tier1 assets:validate` PASS.
- `pnpm --dir urai-tier1 typecheck` PASS.
- `pnpm --dir urai-tier1 build` PASS.
- Next warnings remain non-blocking:
  - CSS `@import` ordering warning.
  - protobuf dynamic dependency warning through Firebase/Firestore path.
  - missing Next ESLint plugin warning.

## Defect list, prioritized

### P0 — Home first-frame composition

Status: patched in latest pass, requires screenshot verification.

Issue: Ground and Passport/Status candidate assets were too close to camera, producing foreground clutter and prototype block shapes.

Fix landed:

- Ground candidate moved below/back.
- Lower-world fallback glow moved below/back.
- Passport/Status hidden from default Home.
- Portal rings repositioned as Ground descent, Life Map ascent, and side-room indicators.

### P0 — Unified world illusion

Status: partially solved.

Home now uses the generated V1 assets and URAI Spatial Home copy. Life Map, Focus, and Replay are still visually stronger than Home and remain separate route components. Ground remains a separate route component.

### P1 — Ground route integration

Status: unresolved.

Ground route still presents as a distinct private operations floor instead of a visibly descended layer from Home. It needs either route wrapping through the shared world shell or a transition bridge from Home descent portal.

### P1 — Life Map route continuity

Status: partially solved.

Life Map feels like a galaxy/sky layer but still exposes route navigation and independent screen behavior. It needs stronger connection to Home below and contextual Focus entry.

### P1 — Diegetic controls

Status: partially solved.

HUD/dashboard feeling reduced on Home. Life Map route bar and some action panels still feel UI-like.

### P2 — Loading polish

Status: partially solved.

Home has a cinematic loading state. Other route loading states need a consistent URAI Spatial boot/transition language.

## Required screenshot verification loop

The GitHub connector cannot launch a browser or capture screenshots. Run this in Cloud Shell/local browser for proof:

```bash
cd ~/urai-spatial
git fetch origin
git switch asset-safe-launch-pack
git pull --ff-only origin asset-safe-launch-pack

pnpm --dir urai-tier1 assets:validate
pnpm --dir urai-tier1 typecheck
rm -rf urai-tier1/.next
pnpm --dir urai-tier1 build
npm run dev
```

Capture desktop and mobile screenshots for:

```text
/?audit=launch-loop-1
/home?audit=launch-loop-1
/spatial/ar-vr?audit=launch-loop-1
/life-map?audit=launch-loop-1
/ground?audit=launch-loop-1
/focus?manifestId=seed-memory-bloom&v=launch-loop-1
/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&v=launch-loop-1
/passport?audit=launch-loop-1
/status?audit=launch-loop-1
```

## Next repair loop

Do not generate more assets.

Next highest-impact repair after screenshot verification:

1. If Home first frame still has foreground clutter, adjust only `SpatialWorldAssetLayer.tsx` positions/scales.
2. If Ground still feels separate, wrap `/ground` in the shared spatial shell or add a descent-state bridge.
3. If Life Map still feels separate, add Home-below visual continuity and remove route-bar/dashboard feel.
4. Preserve Focus/Replay visual strength unless route continuity requires small contextual framing.
