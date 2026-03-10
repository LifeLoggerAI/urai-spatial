URAI SPATIAL TIER-1 KERNEL (FROZEN)

Locked Interaction Files

engine/state/spatialStore.ts
engine/scene/SpatialScene.tsx
engine/scene/Starfield.tsx
engine/camera/CameraRig.tsx
engine/memory/MemorySphere.tsx
engine/replay/ReplayController.tsx

Interaction Chain

Sky
→ Starfield
→ Star Selection
→ Camera Glide
→ Memory Sphere
→ Replay
→ ESC Exit
→ Return to Explore

Rules

Do not modify these files unless fixing a bug.
All future features must layer around this kernel.
