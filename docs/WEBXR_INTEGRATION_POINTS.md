# WebXR Integration Points

This document defines deploy-ready integration points for WebXR, AR, and VR scene playback.

## Routes
- `/spatial` runtime shell
- `/life-map` immersive map shell

## Runtime inputs
- `spatialScenes[]`
- `xrSceneObjects[]`
- generated assets (`glb`, `gltf`, `png`, `svg`, `webp`)

## Integration hooks
- Scene loader resolves assets by `assetId` from shared schema contract.
- XR object transform uses `position`, `rotation`, `scale` arrays.
- Missing provider data must degrade to deterministic fallback scenes.

## Deployment blockers
- Live provider credentials
- Browser/device matrix evidence for target AR/VR hardware
- Production endpoint smoke evidence with WebXR-capable clients
