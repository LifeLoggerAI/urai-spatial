# URAI Spatial Source-of-Truth Production Lock

Status: launch canonicalization lock  
Date: 2026-10-04  
Repo: `LifeLoggerAI/urai-spatial`  
Canonical runtime root: `urai-tier1`

This document records the launch-facing source authority. It must stay aligned with `docs/ARCHITECTURE_LOCK.md`, route-owner tests, and `scripts/check-runtime-authority.mjs`.

## Canonical launch owners

### Home

`/` and `/home` render `FinalHomeThreshold`.

The threshold is the capability-safe initial owner. Before hydration or while WebGL capability is unresolved it renders the authored `HomeSpatialWorldFinal` fallback. Once capability detection settles, the template-mounted `HomeSpatialRuntimeLayer` owns Home on `/` and `/home` only.

The settled runtime path is:

```txt
/ or /home
  -> FinalHomeThreshold
  -> app/template.tsx
  -> HomeSpatialRuntimeLayer
  -> AssetDrivenHomeWorld
  -> HomeSpatialCanvas / governed Home world assets
```

If WebGL is unavailable or the renderer/assets fail, `HomeSpatialRuntimeLayer` fails into the explicit accessible `HomeSpatialWorldFinal` path rather than restoring a second scene engine.

### Life Map

`/life-map` owns its runtime through the route layout:

```txt
/life-map
  -> app/life-map/layout.tsx
  -> SpatialLifeMapCanonical
  -> LifeMapRouteBoundary
  -> ComposedLifeMapScene
```

The page itself intentionally returns no competing scene. Compatibility routes redirect into this canonical owner.

### Focus

`/focus` renders `FocusChamberClient` through the `FinalFocusChamber` route owner.

### Replay

`/replay` renders `CinematicReplayClient` through the `FinalReplayFilm` route owner and retains the Replay launch fingerprint.

### Mirror

`/mirror` renders `MirrorSpatialClient` behind `MirrorBareEntryGuard`.

### Privacy

`/privacy-controls` owns the canonical consent sanctuary. Compatibility privacy URLs must redirect rather than mount a parallel owner.

## Canonical product sequence

```txt
Home -> camera ascent -> Life Map -> selected memory -> Focus -> Replay -> recovery -> Life Map -> Home
```

Ascent is a Home-owned transition into canonical Life Map, not a separate launch runtime.

## Legacy / migration-candidate owners

The following names may remain only as historical/migration code or reusable primitives where a current canonical owner explicitly imports them:

- `TierOneExperience`
- `HomeScene`
- `UraiV1Experience`
- `RootModeExperience`
- `UraiSpatialStage`
- `src/spatial/scene/SpatialScene.tsx`

They are **not** launch route authority and must not be restored on `/`, `/home`, `/life-map`, `/focus`, or `/replay` without an explicit architecture migration that updates this document, `docs/ARCHITECTURE_LOCK.md`, route-owner tests, and release governance together.

## Runtime authority automation

`scripts/check-runtime-authority.mjs` is a fail-closed source-governance check. It verifies at minimum:

- `/` and `/home` retain `FinalHomeThreshold` and reject retired launch owners;
- `app/template.tsx` mounts `HomeSpatialRuntimeLayer`;
- Home runtime activation is pathname-scoped to `/` and `/home`;
- no-WebGL/render failure retains an explicit accessible Home fallback;
- `/life-map` retains one layout-owned `SpatialLifeMapCanonical` runtime;
- Focus, Replay, and Mirror keep their current canonical route owners;
- the architecture lock and this source-of-truth lock name the same current owners.

An unconditional pass is not acceptable runtime-authority evidence.

## Data and provider boundary

1. Production user data remains owner/consent scoped.
2. Public demo/sample data must stay explicitly disclosed.
3. Provider absence must fail safely or use an explicitly designed fallback.
4. Client code may not claim provider, approval, deployment, or source authority that is not actually active.
5. Source presence is not production certification.

## Production lock

The production-lock workflow must run the runtime-authority check in addition to install, preflight, typecheck, tests, build, Firebase boundaries, spatial navigation, accessibility, performance, privacy/security, and exact-head release gates.

A changed exact head invalidates predecessor runtime-authority evidence.

## Definition of done

Runtime source authority is green only when the current exact head:

- has one coherent Home owner and one canonical Life Map owner;
- keeps Focus, Replay, Mirror, Privacy, and compatibility routing on their governed owners;
- contains no restored parallel launch engine;
- passes `pnpm runtime:authority` and the broader exact-head release matrix;
- has current visual/accessibility/privacy/security evidence;
- has truthful production/deployment receipts;
- retains independent-review and production-authorization boundaries.

This lock does not by itself authorize production deployment or independent approval.
