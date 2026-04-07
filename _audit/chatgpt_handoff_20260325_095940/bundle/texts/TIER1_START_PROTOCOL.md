URAI-SPATIAL: TIER 1 START PROTOCOL

Repository: urai-spatial
Phase: Tier 1 Lock
Objective: Make Star → Memory interaction physically undeniable.

Scope is locked. No expansion.

TIER 1 INCLUDES ONLY:

- Deterministic star positions
- Stable camera transitions
- Star glow + dim surrounding stars
- Camera glide into selected star
- In-world memory sphere (no DOM overlays)
- Image texture embedded inside sphere
- Emotional tint + subtle pulse (shader uniform only)
- Replay state isolation
- Eliminate React update loops

GLOBAL STATE CONTRACT:

1. Single spatialMode enum:
   'home' | 'lifemap' | 'memory'

2. Single selectedStarId (string | null)

3. Camera is render-only.
   No camera logic in pointer handlers.

4. No geometry regeneration after mount.

5. Instance matrix writes allowed ONLY for:
   - Selected star scale adjustment

6. Dimming must use per-instance color attribute.
   Do NOT recreate material.

7. Emotional pulse must use shader uniform.
   No material mutation per frame.

8. Memory sphere renders inside same WebGL scene.
   No DOM overlays.
   No layout thrash.

9. Replay mode must not mutate lifemap state.

10. Remove any transient flags not derivable from:
    (spatialMode, selectedStarId)

EXECUTION ORDER:

1. Stabilize
2. Verify invariants
3. Lock branch
4. Document invariants
5. Freeze
6. Then expand

System must be describable using only:
- spatialMode
- selectedStarId

If any behavior cannot be reconstructed from those two values,
refactor until it can.

If drift occurs, ask:
"What is the single next stabilizing action?"

Tier 1 stabilization begins now.
