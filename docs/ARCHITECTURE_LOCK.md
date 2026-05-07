# URAI Spatial Architecture Lock

Status: V1 launch canonicalization
Owner: URAI Spatial
Repo: LifeLoggerAI/urai-spatial

This document locks the current URAI Spatial runtime architecture so future patches do not split scene authority across multiple engines.

## Canonical runtime path

The canonical V1 launch path is:

```txt
Next.js route
  -> src/spatial/layout/TierOneExperience.tsx
  -> src/scene/HomeScene.tsx
  -> React Three Fiber Canvas
  -> cinematic camera, sky, ground, orb, constellation, manifest renderer, particles, postprocessing, narrator
```

The canonical spatial sequence is:

```txt
Home -> Ascent -> Life Map -> Focus -> Replay -> Mirror
```

Route/state mapping:

- `/` and `/home` render `mode="home"`.
- `/ascent` renders `mode="ascent"` as a short cinematic transition state.
- `/life-map` renders `mode="life-map"`.
- `/focus` renders `mode="focus"`.
- `/replay` renders `mode="replay"`.
- `/mirror` renders `mode="mirror"`.

`ascent` is a first-class canonical mode, but it is a transition layer rather than a destination. Home sky/orb activation routes to `/ascent`; the ascent state auto-advances to `/life-map` after the transition duration.

This path is responsible for:

- `/` and `/home` home atmosphere
- `/ascent` cinematic rise into the Life Map
- `/life-map` constellation view
- `/focus` focused memory state
- `/replay` cinematic replay state
- `/mirror` launch-safe mirror/detail state
- sky-click navigation into Ascent, then Life Map
- constellation node selection
- focus panel and replay entry
- Escape unwind behavior
- narrator voice and HUD integration

## Canonical data path

The canonical V1 data path is:

```txt
assetManifests Firestore collection or deterministic seed manifests
  -> useConstellationManifests
  -> ConstellationLayer
  -> selected manifest
  -> ManifestRenderer / FocusActionPanel / Replay route
```

Rules:

1. Demo state must remain deterministic.
2. Firestore-backed state must be optional at launch.
3. `NEXT_PUBLIC_URAI_MANIFEST_FIRESTORE=true` enables live manifest loading.
4. If Firestore is unavailable, the app must fall back to seed manifests without breaking Home, Ascent, Life Map, Focus, or Replay.
5. Memory stars should be generated from manifest/memory objects, not duplicated as disconnected hardcoded systems.

## Legacy / migration-candidate path

The following path exists but is not the canonical V1 route authority:

```txt
src/spatial/scene/SpatialScene.tsx
  -> ThreeSceneRoot
  -> HomeWorld
  -> LifeMapStarfield
  -> useSceneStore
  -> narrator bridges / companion / first-light onboarding
```

This path may contain valuable systems, but it must not compete with the canonical path.

Migration rule:

- Migrate useful systems into `HomeScene` or adjacent canonical modules.
- Do not add new launch behavior to the legacy path unless it is explicitly imported by the canonical path.
- If no imports depend on a legacy module after validation, quarantine or remove it in a cleanup PR.

Known contradiction in this path:

- `ThreeSceneRoot` uses `pointerEvents: "none"` and `aria-hidden="true"` while children contain interactive click/focus handlers.
- If this path is reactivated, interactive controls must live outside the pointer-disabled wrapper or the wrapper must become mode-aware.

## Scene authority rules

1. `HomeScene` owns routed runtime state for V1 launch.
2. `ascent` is the only canonical bridge between Home and Life Map.
3. `ConstellationLayer` owns Life Map node layout and selection for V1 launch.
4. `ManifestRenderer` owns selected asset/manifest rendering.
5. `CinematicCameraRig` owns camera movement in the canonical path.
6. Narrator UI/voice must attach to the canonical routed state, not to duplicate state stores.
7. Zustand scene state in legacy modules must not become a second source of truth unless intentionally merged.

## V1 launch acceptance

URAI Spatial V1 is launch-locked when all of the following pass:

- `/` renders Home.
- `/home` renders Home.
- `/ascent` renders the cinematic ascent transition.
- `/ascent` auto-advances to `/life-map`.
- `/life-map` renders the Life Map / constellation state.
- `/focus` renders focused memory state.
- `/replay` renders replay state.
- `/mirror` renders the mirror/detail fallback without breaking spatial shell.
- Sky click enters Ascent, then Life Map.
- Constellation node click opens focus panel.
- Focus panel can start replay.
- Escape unwinds replay -> focus -> life-map -> home.
- No microphone permission prompt appears on load.
- Firestore manifest failure falls back to seed manifests.
- Reduced-motion users are not trapped in continuous motion.
- Typecheck passes.
- Build passes.
- Unit tests pass.
- E2E lock tests pass.
- Replay tier-5 lock tests pass.
- Canon/tier checks pass.

## Completion sequence

### Phase 1: Canonicalize

- Keep `TierOneExperience -> HomeScene` as V1 runtime authority.
- Lock `Home -> Ascent -> Life Map -> Focus -> Replay -> Mirror` in route and interaction tests.
- Mark legacy modules as migration candidates.

### Phase 2: Data lock

- Promote seed manifests to deterministic demo fixtures.
- Document Firestore `assetManifests` contract.
- Add adapter utilities only where they feed the canonical `ConstellationLayer` / `ManifestRenderer` route.

### Phase 3: Interaction lock

- Lock sky click, ascent auto-advance, node click, focus panel, replay entry, and Escape unwind.
- Ensure keyboard and reduced-motion paths remain accessible.

### Phase 4: Cinematic upgrade

- Add deterministic GPU/star particle budget.
- Add phase-aware camera/director improvements.
- Add quality presets for bloom/depth/vignette/chromatic effects.
- Add mobile gesture polish.
- Keep reduced-motion fallback.

### Phase 5: Ship lock

- Run the full validation chain.
- Close roadmap issues only after acceptance criteria pass.
- Tag the repo when V1 is locked.

## Definition of done

URAI Spatial is complete for V1 when it has one canonical runtime architecture, no duplicate scene authority, deterministic demo and optional Firestore-backed memory constellations, locked Home -> Ascent -> Life Map -> Focus -> Replay -> Mirror navigation, no accessibility regressions, no unwanted microphone prompt, passing validation, and a clear split between V1 launch lock and V2/AAA expansion work.
