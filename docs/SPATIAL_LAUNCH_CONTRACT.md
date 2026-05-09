# URAI Spatial Launch Contract

URAI Spatial is currently a fallback/demo spatial shell. It previews the immersive URAI interface while keeping live provider claims disabled until integration work is implemented and verified.

## Current launch mode

| Area | Status |
| --- | --- |
| Spatial home shell | Live demo shell |
| LifeMap starfield/replay shell | Live demo shell |
| Orb companion | Local fallback/scaffold |
| Body biometric panel | Privacy-safe fallback/scaffold |
| AR/WebXR session provider | Deferred |
| Wearable provider | Deferred |
| Live biometric/camera provider | Deferred |
| Memory-grounded orb provider | Deferred |
| Asset-factory spatial jobs | Deferred |
| Cross-repo user memory sync | Deferred |

## Required boundary

Do not claim live AR/WebXR, wearable, biometric, memory-grounded, or asset-factory providers are active unless all of the following are true:

1. Provider credentials are configured through deployment/server secrets only.
2. User consent exists for camera, biometric, wearable, location, and memory-grounded providers as applicable.
3. Fallback mode remains available when providers fail or are unavailable.
4. System APIs do not expose secrets or privileged provider details.
5. Smoke and E2E tests prove core routes still work without live providers.
6. Public copy clearly distinguishes preview seams from live capabilities.

## Contract source

The code contract lives in:

```txt
urai-tier1/src/lib/spatial-launch-boundaries.ts
```

The system APIs expose the launch boundary through:

```txt
/api/system/launch-boundary
/api/system/capabilities
/api/system/integration-contract
```

Use `/api/system/launch-boundary` when another URAI repo needs a focused provider-readiness check without parsing the full integration contract.

## Deferred capabilities

The following must remain deferred until explicitly implemented and verified:

- `live-ar-webxr-session`
- `live-camera-biometric-provider`
- `live-wearable-provider`
- `live-memory-grounded-orb`
- `live-spatial-asset-factory-jobs`
- `live-cross-repo-user-memory-sync`

## Required checks

```bash
pnpm check:spatial-copy
pnpm check:launch-boundary-contract
pnpm check:spatial
pnpm launch:check
```

## Go/no-go rule

Ship URAI Spatial only if the fallback shell is stable and all copy, APIs, and docs agree that live providers are not active. Provider rollout requires a separate implementation PR with consent, tests, route smoke coverage, and deployment evidence.
