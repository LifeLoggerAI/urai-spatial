# URAI Spatial System Map

Date: 2026-05-16
Repository: `LifeLoggerAI/urai-spatial`
Runtime app root: `urai-tier1`
Package manager: `pnpm`
Framework: Next.js / React / TypeScript

## Canonical product boundary

URAI Spatial is the immersive spatial interface layer of URAI: a cinematic, passive, privacy-aware web shell for Home, LifeMap, body/avatar zoom, sky, ground/world, orb companion navigation, biometric fallback panels, replay, and future AR/VR/WebXR expansion.

The current implementation is release-locked around a safe local/provider-fallback mode. Live AR, WebXR, biometric, wearable, memory-grounded, Firebase, and Stripe provider claims must only be made after deployment secrets, provider connections, and smoke tests are verified.

## Runtime topology

```txt
repo root
├─ package.json                     # monorepo scripts and release gates
├─ pnpm-workspace.yaml              # workspace boundary
├─ firebase.json / firebase.static.json
├─ ENVIRONMENT.md                   # environment and provider notes
├─ README.md                        # repo overview and route/API map
├─ docs/PRODUCTION_AUDIT.md         # production-side audit
├─ scripts/                         # invariant, smoke, release, lock, Firebase checks
├─ tests/                           # cross-app E2E/lock/replay tests
└─ urai-tier1/                      # production Next.js runtime app
   ├─ package.json                  # app scripts and dependencies
   ├─ src/app                       # pages and API routes
   ├─ src/components                # LifeMap / spatial components
   ├─ src/lib                       # system contract, launch boundaries, provider seams
   ├─ src/spatial                   # 3D world model and spatial runtime contracts
   ├─ scripts                       # tier locks, XR validation, seeders
   └─ tests                         # unit/runtime/XR/LifeMap tests
```

## Core subsystems

### 1. Spatial home shell

- Runtime component: `urai-tier1/src/app/_spatial/SpatialHomeShell.tsx`.
- Surfaces: home, orb, avatar/body zoom, head, torso, arms, legs, sky LifeMap preview, ground/world preview.
- Guarantees: cinematic shell, keyboard escape-to-home, reduced-motion CSS accommodation, explicit fallback/provider status, non-diagnostic wellness language.

### 2. LifeMap and replay layer

- Routes declared by the system contract include `/life-map` and `/demo/life-map`.
- Capability contract includes LifeMap starfield, replay state machine, 3D camera presets, 3D star depth model, and 3D replay path model.
- Data contract references `lifemap_nodes` and `lifemap_replays` collections for live rollout.

### 3. Orb companion layer

- UI seam: `OrbChatPanel` inside `SpatialHomeShell.tsx`.
- API route: `/api/orb-companion`.
- Modes: `local-fallback` and future `memory-grounded`.
- Route hints: home, brain/head, chest/torso, arms/device, legs, sky LifeMap, ground/object memory, LifeMap.

### 4. Body biometric fallback layer

- UI seam: `BodyBiometricPanel` inside `SpatialHomeShell.tsx`.
- API route: `/api/body-biometric`.
- Regions: head, torso, arms, legs.
- Sources: mock, live-device, passive-inference.
- Required language: privacy-safe, non-diagnostic, fallback-labeled unless live providers are connected and verified.

### 5. System contract APIs

Canonical API registry is exported from `urai-tier1/src/lib/spatial-system-contract.ts`:

- `/api/system/health`
- `/api/system/manifest`
- `/api/system/capabilities`
- `/api/system/integration-contract`
- `/api/system/launch-boundary`
- `/api/system/tier2`
- `/api/system/urai-spatial-lock`
- `/api/system/urai-spatial-3d-world`
- `/api/body-biometric`
- `/api/orb-companion`

The integration contract centralizes routes, APIs, capabilities, lock state, launch boundaries, fallback mode, data contracts, and safety guarantees.

### 6. 3D / XR / AR / WebXR layer

Implemented today as a 3D world model, camera/depth/replay contracts, and future-provider seams. The codebase includes XR contract, Quest validation, and navmesh bake scripts, but the release boundary requires that live AR/WebXR not be claimed until device/provider validation passes.

### 7. Firebase / Firestore layer

Suggested live rollout collections:

- `spatial_sessions`
- `spatial_nodes`
- `lifemap_nodes`
- `lifemap_replays`
- `body_biometric_snapshots`
- `orb_companion_events`
- `spatial_assets`
- `spatial_anchors`
- `user_spatial_preferences`

Production audit also identifies SaaS entitlement routes and Firestore entitlement persistence. Live write paths require owner/tenant-scoped Firestore rules and production secrets.

### 8. Stripe / entitlement layer

Production audit identifies secure checkout, webhook, webhook-v2 alias, and entitlement API work in `urai-tier1`. This layer remains deployment-dependent until Stripe/Firebase secrets, products, webhook endpoint, and real smoke tests are configured.

### 9. Privacy and permission layer

Privacy posture is explicit fallback mode:

- no secrets returned by system APIs;
- fallback/demo state labeled;
- biometric data presented as wellness-supportive, not diagnosis;
- live providers require explicit consent and launch verification;
- AR/WebXR/wearable providers remain deferred until connected.

### 10. Documentation and verification layer

Existing scripts include source integrity, route exposure, spatial invariant, launch boundary, XR verification, runtime authority, canon/tier locks, Firestore boundary checks, Playwright/E2E checks, smoke routes, and release gates.

## Drive-derived product context

Google Drive URAI IP materials describe broader ecosystem families that URAI Spatial should align with: AR/VR Companion Fusion, Symbolic Life Map + Avatar Fusion, Multi-Modal Dream Map, Scene-Graph Compression & Replay Index, Spatial Consent Layer, Causal Insight Generator, Digital Mood Weather, Meta-Pattern Cognition Engine, Recovery Timeline, Ethics Ledger, Global Insight Exchange, Consent Tiering, Insight Provenance, Bias Mitigation, and related URAI system families.

Treat those as product-direction inputs, not automatic claims that every family is live in this repo.

## Canonical implementation rule

Do not create parallel runtime roots. Runtime code belongs under `urai-tier1`. Root-level code, archived code, and audit bundles are historical/non-runtime unless explicitly wired into root scripts and release gates.
