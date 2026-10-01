# URAI Spatial Launch Contract

URAI Spatial now contains the converged source paths for the core immersive journey plus gated Life Movie, Council, Memory World, Interpretive World, Captured Reality, Android, and XR surfaces. Source presence is not provider, device, Gold Master, deployment, or production certification. Live-provider and sensitive-runtime claims remain fail-closed until their own exact runtime evidence exists.

## Current launch mode

| Area | Status |
| --- | --- |
| Spatial home shell | Integrated candidate; final literal Gold Master acceptance remains separate |
| Life Map / Focus / Replay | Integrated candidate; exact-head runtime and pixel evidence required |
| Orb / Council | OpenAI path plus disclosed local fallback; other Council providers remain not-connected until separately verified |
| Body biometric panel | Privacy-safe fallback/scaffold |
| AR/WebXR session | Browser/session source implemented; physical-device certification remains separate |
| Wearable provider | Deferred |
| Live biometric/camera provider | Deferred |
| Memory-grounded orb provider | Deferred |
| Captured / interpretive spatial jobs | Source/runtime contracts implemented behind release gates; accepted reconstruction/runtime receipts remain separate |
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

## Sensitive-provider consent and audit gates

The rollout gate is now explicit even while these providers remain disabled. Any future activation must pass the code contract in `spatialSensitiveProviderConsentGates` before provider-backed writes are permitted.

| Capability | Runtime target | Required consent | Retention boundary | Audit boundary |
| --- | --- | --- | --- | --- |
| `live-ar-webxr-session` | Browser WebXR | Explicit per-session consent plus enforced location policy where persistent spatial/location data is introduced | Browser entry is session-only | `privacyAudit` before any provider-backed persistence |
| `live-camera-biometric-provider` | Server provider adapter | Explicit session consent plus enforced identity/models policy | Purpose-bound configured retention | `privacyAudit` |
| `live-wearable-provider` | Native provider bridge | Explicit session consent plus enforced identity/memory policy | Purpose-bound configured retention | `privacyAudit` |
| `live-memory-grounded-orb` | Server provider adapter | Explicit session consent plus enforced memory/models policy | No raw provider copy without a separate grant | `privacyAudit` |

All four gates remain `providerWritesAllowed: false` in the launch contract. The Quest browser entry additionally requires a local session-consent checkbox before `requestSession('immersive-vr')`; that consent is cleared when the immersive session ends. This defines the rollout boundary without claiming provider-backed AR, biometric, wearable, or memory persistence is live.

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

Ship UrAi only from the current governed exact-head candidate after all applicable internal gates, literal visual acceptance, independent review, and subsequent protected deployment requirements are satisfied. A source path or green unit test never authorizes a live-provider claim. Provider rollout still requires consent, exact runtime evidence, route smoke coverage, truthful attribution, and deployment evidence.
