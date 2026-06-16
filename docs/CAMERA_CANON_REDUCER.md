# URAI Spatial Camera Canon Reducer

Status: implementation note for the canonical camera authority pass.

## Problem

URAI Spatial had several React Three Fiber camera writers mounted in different scene branches. The risky pattern was multiple `useFrame` callbacks independently writing to the same camera each frame:

- `CameraDirector`
- `CinematicCameraRig`
- `LifeMapCameraLock`
- replay scene camera helpers
- XR locomotion hooks
- look-at authority helpers

That creates a hidden last-writer-wins race. The app may build and render while still feeling visually inconsistent because camera ownership is distributed.

## Long-term rule

There must be one canonical camera decision layer. Scene systems may publish intent, but they must not each become independent camera authorities.

The canonical layer is `urai-tier1/src/spatial/canon/cameraCanon.ts`.

## Reducer shape

The camera state machine is phase-based:

- `HOME`
- `ASCENT`
- `LIFEMAP`
- `FOCUS`
- `open_replay`
- `close_replay`
- `close_focus`
- `go_home`

Each phase resolves to:

- camera position
- camera target
- field of view
- convergence duration
- damping
- atmosphere
- veil

## Intended frame flow

```text
Scene mode / route / transition intent
  ↓
normalizeTransitionPhase
  ↓
resolvePose + resolveCameraConvergence
  ↓
single camera applicator
  ↓
camera.position, camera.lookAt, camera.fov
```

## Rules for future work

1. New scene systems should not write directly to `camera.position` unless they are the canonical applicator for that canvas.
2. Visual systems may animate their own meshes, groups, particles, materials, shaders, or postprocessing.
3. Camera target changes should be expressed as phase, transition progress, or explicit canonical pose input.
4. XR may override camera only inside an XR-only boundary.
5. Replay may override camera only inside a replay-only boundary and should use deterministic replay state.
6. Any compatibility wrapper must delegate to camera canon rather than inventing a second motion model.

## Why this matters

This keeps URAI Spatial deterministic, replay-safe, less jitter-prone, and easier to upgrade into Genesis/Tier-2/Tier-3 without accumulating competing visual engines.
