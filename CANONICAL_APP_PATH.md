# Canonical App Path

- **Canonical app root**: `urai-tier1`, as defined by [CANONICAL_RUNTIME.md](CANONICAL_RUNTIME.md).
- **Current Home route entry**: `urai-tier1/src/app/page.tsx` renders `urai-tier1/src/app/FinalHomeThreshold.tsx`. The entry component handles initial hydration and capability fallback; it is not the whole settled scene.
- **Shared world boundary**: `urai-tier1/src/app/layout.tsx` renders `WorldRuntimeBoundary`, which wraps route children with `UraiWorldStateProvider` and `UraiWorldShell`. The shell owns shared transitions and companion/haptic runtime consumers.

## Preserved scene source

`urai-tier1/src/spatial/scene/SpatialScene.tsx` remains existing scene source. Its earlier `Starfield`, `CameraRig`, and `MemorySphere` composition reference must not be read as the current Home page entrypoint.

The corresponding earlier scene state/data references are `urai-tier1/src/spatial/state/sceneStore.ts` and `urai-tier1/src/spatial/data/stars.ts`. Verify their actual consumers before describing them as current route authority; source presence alone does not prove integration.

## Commands and acceptance

Use the root pnpm runtime and validation commands recorded in [CANONICAL_RUNTIME.md](CANONICAL_RUNTIME.md). The canonical authority index is [docs/system/CANON_INDEX.md](docs/system/CANON_INDEX.md).

This document records inspected source entry and boundary relationships. It does not certify settled visuals, personal data, provider behavior, device operation, deployment, release acceptance, or a Golden Master.
