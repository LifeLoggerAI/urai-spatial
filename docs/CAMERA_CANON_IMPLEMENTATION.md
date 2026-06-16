# Camera Canon Implementation Pass

This pass records the done-done direction for URAI Spatial camera control.

## What changed

- Added a documented camera canon reducer contract.
- Identified `cameraCanon.ts` as the authoritative resolver for camera phase, pose, damping, veil, and atmosphere.
- Locked the future rule that scene systems publish intent and visual systems animate visuals; camera transforms should be applied by one canonical authority per canvas.

## What remains intentionally compatible

The repo still contains legacy visual engines and compatibility wrappers. They are not deleted in this pass because the app currently builds all 56 routes and those routes still rely on multiple visual generations.

The safe path is incremental hardening:

1. Keep all buildable routes intact.
2. Make new camera work flow through `cameraCanon.ts`.
3. Collapse camera writers only after route-level visual parity tests exist for `/`, `/home`, `/spatial`, `/spatial/v1`, `/life-map`, `/spatial/life-map`, and replay surfaces.
4. Delete legacy render systems only after they have no imports and no route ownership.

## Founder-level product note

The app is operationally alive. The remaining quality gap is visual unity: several generations of LifeMap, SpatialScene, and replay rendering coexist. The long-term product move is to make `cameraCanon.ts` and the canonical LifeMap graph the spine, then make all pages render as modes of one world rather than separate prototypes.
