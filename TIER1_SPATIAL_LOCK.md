# URAI Spatial – Tier-1 Lock

Status: LOCKED
Phase: Tier-1 Spatial Interaction Engine

Tier-1 defines the deterministic spatial memory interaction loop.

Interaction Chain

Sky → Starfield → Star Selection → Camera Glide → Memory Sphere → Embedded Memory → Replay → Exit Replay → Return

Verified Behavior

1. Deterministic star positions
2. Reliable star click selection
3. Selected star glow
4. Surrounding stars dim
5. Smooth camera glide to star
6. Camera stops at fixed distance
7. Memory sphere spawns at star
8. Image embedded inside sphere
9. Replay mode activation
10. Replay state isolation
11. ESC exits replay
12. Camera returns to home position
13. No runtime errors
14. No React update loops

Locked Components

engine/space/Starfield.tsx
engine/camera/CameraRig.tsx
engine/state/spatialStore.ts
engine/replay/ReplayController.tsx

Lock Rules

• Tier-1 interaction logic cannot be modified
• Star selection → camera → replay chain is immutable
• Tier-2 work must extend visuals only
• No structural refactors of Tier-1 systems

Tier-1 Status

Spatial memory interaction loop is complete and stable.
This checkpoint represents the first functional version of the URAI spatial memory engine.
