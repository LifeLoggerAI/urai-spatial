# URAI Spatial — Roadmap (copy/paste operating plan)

## Phase 0 — Foundation (DONE by bootstrap)
- Firestore canonical collections: worlds/scenes/entities/anchors/sessions/assets/builds
- Privacy-first rules: no raw frames; opt-in scanning via spatialSessions
- Functions: createWorld, requestScanSession, publishAsset, finalizeBuild
- Storage rules: published/build outputs read-only; staging denied to clients
- Deterministic pipeline: hash -> manifest -> publish

## Phase 1 — Spatial Runtime v1 (WebXR reference)
- Scene graph: World -> Scene -> Entities (room/portal/prop/anchor)
- Interaction: select, grab, teleport (XR controllers) + desktop fallback
- Deterministic rendering: seeded starfield + fixed update budget
- Portal transitions: fade -> load scene -> place user at spawn

## Phase 2 — AR Anchors (opt-in)
- Session gating: require spatialSessions.scanOptIn == true
- Anchors store ONLY: pose + anchorId + worldId + sessionId (no frames)
- Platform adapters: WebXR anchors (where supported), ARCore/ARKit native later
- Anchor lifecycle: create -> refine -> lock -> export

## Phase 3 — Asset Pipeline v1
- Import formats: GLB/HDR/KTX2
- Optimize: meshopt + draco (optional), texture transcode to KTX2
- Publish: storagePath = spatial/published/assets/<sha256>.<ext>
- Register: functions.publishAsset (admin only)
- Build packages per platform -> functions.finalizeBuild

## Phase 4 — VR Systems
- Hand tracking abstraction (Quest / OpenXR)
- Locomotion: teleport + comfort mode
- Performance budgets: draw call caps, LOD tiers, baked lighting option

## Phase 5 — Safety & Consent hardening
- Consent tiers: per-world + per-session + per-anchor
- Red-team fields: reject any unexpected large blobs / frame-like payloads
- Audit logs (optional): store only metadata, no sensitive payload

## Phase 6 — Native stacks (later)
- Unity/OpenXR client(s)
- visionOS immersive spaces
- ARKit/ARCore persistent anchors

