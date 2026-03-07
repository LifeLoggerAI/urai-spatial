URAI Spatial Engine — Tier-1 Architecture Snapshot

Tier-1 Objective
Make Star → Memory interaction physically undeniable.

Core Systems
- Deterministic starfield generation
- Camera glide toward selected star
- Star bloom with surrounding star dim
- Memory sphere rendered in-world
- Image payload embedded in sphere
- Replay state isolation
- No React update loops

Key Engine Components
engine/spine/EngineSpine.tsx
engine/stars/Starfield.tsx
engine/stars/StarGlowMaterial.ts
engine/scene/MemorySphere.tsx
stores/spatialStore.ts

Interaction Loop
User click → star selected
↓
surrounding stars dim
↓
camera glides to star
↓
memory sphere appears
↓
state resets when another star is selected

Tier-1 Status
LOCKED
