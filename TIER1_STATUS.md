# Tier 1 Status

Status: current-source status note. This file must not override exact-head release receipts, protected deployment receipts, provider state, DNS/TLS evidence, or independent review gates.

## Implemented runtime foundation

- **Page Entry**: `urai-tier1/src/app/page.tsx` remains the application entry surface.
- **Spatial Scene**: `urai-tier1/src/spatial/scene/SpatialScene.tsx` remains a primary scene-composition authority.
- **Deterministic Stars**: Seed-based deterministic star generation is implemented in `urai-tier1/src/spatial/data/stars.ts`.
- **Promoted Spatial Assets**: Canonical source includes promoted launch-critical Home, Portal, Orb, Ground, Life Map memory-star, Focus memory-chamber, and Replay memory-environment assets through the promoted asset resolver and promotion state.
- **Life Map**: Current source contains the Life Map route and exact-head visual-proof workflow. Release certification remains bound to the current pull-request SHA and its retained artifacts; source presence alone is not a production claim.
- **Replay**: Replay is an implemented runtime surface with promoted memory-environment support and route-level verification. It is not a deferred scaffold.
- **Mirror**: Current release proof exercises direct entry, desktop/mobile inspection, fallback/failure/offline states, reduced motion, and transitions to Replay and Passport. Retained exact-head proof remains the acceptance authority.
- **Passport**: Passport ownership/control verification exists in current source and has dedicated exact-head workflow coverage.
- **Native/XR Doorways**: Source and static doorway verification exist. Physical-device XR certification remains a separate gate and must not be inferred from browser/static proof.

## Current asset truth

Canonical asset authority is the `urai-spatial` runtime manifest and promoted-asset state, not legacy `UrAi` manifest paths.

- Final promoted GLB/runtime assets are resolved from `urai-tier1/src/spatial/assets/assetManifest.ts`, `assetPromotionState.ts`, and `promotedAssetResolver.ts`.
- Emergency proof fallbacks remain intentionally separate from promoted assets.
- The Life Map HDR skybox is not promoted and retains a procedural/degraded fallback until its own rendered-promotion gate is satisfied.
- Ambient audio remains separately governed and must not be described as final without its mix/loudness/permission evidence.

## Release status

Do not use this document to claim a deploy or launch.

The active production-certification authority is the current `release/post-1072-production-certification` pull request and its exact head. Any source commit changes that exact-head identity and invalidates earlier head-bound workflow evidence.

Release acceptance still requires, at minimum:

1. all required workflows terminal on one unchanged exact head;
2. retained visual/runtime evidence inspected rather than inferred from a green check alone;
3. an eligible non-author human approval on that unchanged head;
4. protected merge and deployment receipts;
5. custom-domain DNS/TLS/live fingerprint verification;
6. a distinct rollback identity and verified recovery path.

## Known external or governance gates

- Eligible independent reviewer access remains an owner/organization configuration requirement; self-approval, bots, read-only users, and triage-only users do not satisfy the release gate.
- DNS/registrar recovery, provider IAM credential-incident closure, and other provider-side evidence are external to this source-status file.
- Production staging, monitoring, recovery, and rollback must be established by protected runtime receipts, not repository documentation.

## Historical note

Older versions of this file described camera work as partial, the memory sphere as a placeholder, and Replay as not implemented/deferred. Those statements are superseded by the current runtime/source architecture and exact-head release-evidence system. Historical Git versions remain available for audit.
