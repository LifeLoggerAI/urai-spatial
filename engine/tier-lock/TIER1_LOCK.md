URAI Spatial — Tier-1 System Lock

Status: LOCKED  
Scope: Core Spatial Interaction Loop

---------------------------------------------------------------------

Tier-1 Interaction Loop (Guaranteed)

Sky
→ Starfield
→ Star Selection
→ Camera Glide
→ Memory Sphere
→ ESC Return

This loop defines the canonical URAI Spatial experience and must
remain deterministic and stable.

---------------------------------------------------------------------

Tier-1 Locked Behaviors

1. Deterministic star generation
2. InstancedMesh star rendering
3. Star click selection
4. Camera glide to selected star
5. Memory sphere spawn
6. Memory image rendering
7. ESC reset to LifeMap
8. No uncontrolled runtime render loops
9. No duplicate scene graph roots

These behaviors form the minimum viable spatial engine.

---------------------------------------------------------------------

Tier-1 Architectural Guarantees

• Star positions are deterministic
• Camera movement is smooth and interpolated
• Scene graph remains stable and predictable
• Interaction state transitions are atomic
• Rendering cost remains bounded

---------------------------------------------------------------------

Post-Lock Restrictions

The following systems are considered frozen under Tier-1:

Camera Architecture
Scene Graph Structure
Star Generation Logic
Core Spatial State Stores

Changes to these systems require an explicit **Tier-1 Unlock**.

---------------------------------------------------------------------

Permitted Work After Lock

New features must be implemented outside the locked components.

Allowed extension areas include:

• Replay systems
• Insight overlays
• UI panels
• Visual effects
• Narrative layers
• Data enrichment

These systems may observe Tier-1 state but must not modify its
core mechanics.

---------------------------------------------------------------------

Unlock Procedure

Tier-1 may only be unlocked if one of the following conditions is met:

1. Critical stability issue
2. Performance regression
3. Architectural refactor approved by system owner

Any unlock must include:

• reason for unlock
• affected components
• rollback plan

---------------------------------------------------------------------

End of Tier-1 Lock