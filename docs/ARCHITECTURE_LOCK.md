# URAI Spatial Architecture Lock

Status: launch canonicalization locked
Owner: URAI Spatial
Repo: LifeLoggerAI/urai-spatial

This document locks the current URAI Spatial runtime architecture so future patches do not split scene authority across parallel engines.

## Canonical runtime owners

The launch-facing runtime is intentionally split by destination ownership, not by duplicate mode shells:

```txt
/ and /home
  -> FinalHomeThreshold
  -> WorldRuntimeBoundary
  -> HomeSpatialRuntimeLayer
  -> HomeSpatialCanvas / HomeSpatialWorldFinal

/life-map
  -> life-map route layout
  -> SpatialLifeMapCanonical
  -> LifeMapRouteBoundary
  -> ComposedLifeMapScene

/focus
  -> FocusChamberClient (FinalFocusChamber)

/replay
  -> CinematicReplayClient (FinalReplayFilm)

/privacy-controls
  -> ConsentSanctuaryClient
```

There is no launch `TierOneExperience`, `RootModeExperience`, `UraiV1Experience`, or `UraiSpatialStage` owner. Those retired multi-mode runtimes must not be restored.

## Compatibility routes

Compatibility URLs do not mount another WebGL scene. They redirect into the real owner whose runtime boundary matches the destination pathname.

- `/spatial`, `/spatial/v1`, `/v1`, `/ascent`, and `/spatial-fallback` resolve to canonical Home.
- `/spatial/life-map`, `/spatial/life-map-r3f`, `/spatial/life-map-orbit`, and `/unwind` resolve to canonical Life Map.
- `/u/[handle]`, `/u/adamclamp`, and `/demo/life-map` preserve disclosed sample-demo semantics by redirecting into canonical Life Map with demo query context.
- `/privacy` resolves to the canonical Consent Sanctuary at `/privacy-controls`.

A compatibility route must never directly mount a canonical WebGL component when that component's runtime authority only activates for another pathname.

## Canonical spatial sequence

The product sequence remains:

```txt
Home -> camera ascent -> Life Map -> selected memory -> Focus -> Replay -> recovery -> Life Map -> Home
```

Ascent is a Home-owned camera transition, not a second destination runtime. Home sky activation begins the transition and navigates to `/life-map?from=home-sky` after the bounded camera move. Reduced-motion users retain an immediate bounded path.

## Scene authority rules

1. `FinalHomeThreshold` is the route-level Home entry and capability-safe initial owner.
2. `HomeSpatialRuntimeLayer` owns settled Home WebGL only on `/` and `/home` and owns the legitimate no-WebGL Home fallback.
3. `SpatialLifeMapCanonical` is owned by the `/life-map` route layout and must not be mounted on alias paths.
4. `ComposedLifeMapScene` owns the single canonical Life Map Canvas and selected-memory camera journey.
5. `FocusChamberClient` owns Focus; `CinematicReplayClient` owns Replay.
6. Shadow and Council use their capability-aware `SpatialRealmRuntime` owner with semantic no-WebGL access.
7. Compatibility URLs use redirects, not duplicate scene trees.
8. Narrator, state, camera, fallback, and proof systems may observe a canonical owner but may not create a second launch-facing product runtime.

## Canonical data path

User-owned memory and field data flows into canonical scene adapters. Explicit public-demo paths may use deterministic sample data, but sample/demo ownership must remain disclosed and must not become another product engine.

Rules:

1. Production user data remains consent and owner scoped.
2. Public demo routes use sample data only.
3. Provider absence must fail safely or use an explicitly designed fallback; it must not silently substitute a technical/demo scene.
4. Memory stars are derived from the canonical Life Map model rather than duplicated hardcoded systems.
5. No client route may claim a provider, approval, deployment, or data source that is not actually active.

## Legacy / migration-candidate path

Legacy modules can remain only when a current canonical owner imports them for a specific reusable primitive. A self-contained legacy scene, mode router, or stage with no legitimate consumer is dead code and should be removed rather than preserved as an alternate runtime.

The legacy `src/spatial/scene/SpatialScene.tsx` family remains migration-candidate code unless current route evidence proves a canonical import. It must not become a second route authority.

## Launch acceptance

URAI Spatial launch acceptance requires:

- `/` and `/home` render the same canonical Home world and capability fallback.
- Home Ground, Orb, portals, and sky ascent are one continuous world.
- Home ascent resolves into canonical `/life-map` without a blank alias-mounted canvas.
- Life Map has one Canvas owner, deterministic camera travel, selected-memory controls, Focus, Replay, overview, Escape recovery, mobile composition, reduced-motion behavior, and WebGL loss/recovery handling.
- Shadow and Council retain legitimate no-WebGL fallbacks.
- Compatibility URLs resolve to canonical owners without parallel product runtimes.
- No debug/demo/diagnostic chrome appears on user-facing launch surfaces.
- Privacy routes resolve to the canonical consent system.
- Typecheck, tests, production build, Firebase checks, accessibility, performance, privacy, security, spatial navigation, and release readiness pass on one unchanged exact head.
- Required visual proof is inspected at full resolution against the URAI visual canon.
- Governed assets and independent release approval are truthful and exact-head bound.

## Definition of done

URAI Spatial is release-complete when it has one coherent Home world, one canonical Life Map runtime, canonical Focus/Replay/realm owners, compatibility redirects instead of parallel engines, no obsolete multi-mode launch stage, no accessibility/privacy/security regressions, exact-head terminal validation, acceptable full-resolution visual evidence, truthful governance, protected merge, protected production deployment from `main`, and verified live behavior on `urai.app`.
