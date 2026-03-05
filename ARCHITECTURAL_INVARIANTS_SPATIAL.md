# ARCHITECTURAL_INVARIANTS_SPATIAL.md

Version: 1.0.0
Scope: URAI Spatial Engine (Tier 1 Loop)
Status: **LOCKED & FROZEN**

This document defines the non-negotiable architectural guarantees for the Tier 1 Spatial Loop. All new features must comply. Violations block release.

---

### 1. State Atomicity Invariant

1.1 All state transitions that modify `spatialMode` MUST be atomic.
1.2 The primary selection action (`selectStar`) MUST be idempotent and self-guarding.
1.3 Selection is only possible if and only if `spatialMode === 'lifemap'` AND `selectedStarId === null`.
1.4 State updates MUST use a functional `set((state) => ...)` in Zustand to prevent race conditions from stale closures.

**Violation Impact**: Race conditions, non-deterministic state, camera instability, visual artifacts.

---

### 2. Deterministic Rendering Invariant

2.1 All star positions MUST be generated from a stable, deterministic seed. No unseeded `Math.random()` for object placement.
2.2 Instance matrices MUST be written once post-mount and only updated based on deterministic state changes (`selectedStarId`).
2.3 No geometry regeneration shall occur after the initial mount.
2.4 Object IDs MUST remain stable across reloads and replays.

**Violation Impact**: Replay drift, non-reproducible scenes, performance degradation.

---

### 3. Camera System Isolation Invariant

3.1 The camera's position and target MUST be a pure consequence of reading application state (`spatialMode`, `selectedStarId`).
3.2 No direct camera mutation is permitted inside pointer handlers or event callbacks.
3.3 Camera movement logic (e.g., `lerp`, `damp`) MUST NOT be a condition for state transitions. It is only a presentation effect.

**Violation Impact**: Non-deterministic camera paths, cinematic contract violations, coupling of logic and presentation.

---

### 4. Interaction & Transition Integrity Invariant

4.1 Pointer interactions (e.g., star clicks) MUST be logically blocked at the state level when a transition is in progress (`spatialMode !== 'lifemap'`).
4.2 UI-level guards are secondary safeguards; the primary invariant MUST live in the state store.
4.3 No component may directly mutate global state; all actions must be dispatched through the store.

**Violation Impact**: User-induced race conditions, corrupted state transitions, UI/state desynchronization.
