
# ARCHITECTURAL_INVARIANTS_SPATIAL.md

Version: 1.0.0  
Scope: URAI Spatial Engine (Home + Derived Scenes)  
Status: LOCK CANDIDATE  

This document defines non-negotiable architectural guarantees for the Spatial layer.
All new features must comply. Violations block release.

---

# 1. Identity Continuity Invariant

1.1 Every rendered symbolic object MUST map to a persistent stable ID.  
1.2 IDs MUST originate from backend data or deterministic seed logic.  
1.3 No runtime-generated UUIDs in production scenes.  
1.4 Object IDs MUST remain stable across reloads and replays.

Violation Impact:
- Replay drift
- Cross-scene desync
- Non-deterministic rendering

---

# 2. Deterministic Rendering Invariant

2.1 Given identical input data, the scene MUST render identically.  
2.2 All procedural placement MUST use seed-based deterministic functions.  
2.3 No `Math.random()` calls allowed in scene render paths.  
2.4 Star positions MUST derive from timestamp + orgId seed (or equivalent stable key).

Violation Impact:
- Memory constellations shift
- Replay integrity breaks
- Visual trust degradation

---

# 3. Multi-Tenant Isolation Invariant

3.1 All symbolic data MUST be scoped under `orgs/{orgId}` in Firestore.  
3.2 No global top-level symbolic collections permitted.  
3.3 All client queries MUST include orgId path scoping.  
3.4 orgId MUST originate from authenticated token, not URL param.  
3.5 Cloud Functions MUST verify orgId equality before processing.

Violation Impact:
- Cross-tenant data leakage
- Enterprise disqualification
- Security breach risk

---

# 4. Interaction Contract Invariant

4.1 Interactive objects MUST NOT mutate global state directly.  
4.2 All interaction MUST pass through central dispatcher/store.  
4.3 Mesh components MUST remain side-effect free.  
4.4 Interaction state MUST be observable and auditable.

Violation Impact:
- Hidden state mutation
- Debug complexity explosion
- Non-replayable interactions

---

# 5. Transition Integrity Invariant

5.1 Scene transitions MUST complete animation before route change.  
5.2 Direct navigation from click handler is prohibited.  
5.3 Transition state MUST block further interaction.  
5.4 No hard scene unmount without fade or warp completion.

Violation Impact:
- Cinematic contract violation
- User perceptual break
- Race condition risk

---

# 6. Anchor Stability Invariant

6.1 Anchor registry MUST be versioned.  
6.2 Anchor positions MUST be deterministic and reproducible.  
6.3 Anchor IDs MUST not change across releases.  
6.4 Anchor rendering MUST not depend on viewport randomness.

Violation Impact:
- Relationship drift
- Replay inconsistency
- Spatial meaning collapse

---

# 7. Scene Isolation Invariant

7.1 Home scene and LifeMap scene MUST not share mutable local state.  
7.2 Scenes may share:
    - Tenant context
    - Interaction dispatcher
    - Symbolic ID contracts
7.3 Scenes MUST mount/unmount independently without state bleed.

Violation Impact:
- Ghost state artifacts
- Memory corruption
- Scene cross-contamination

---

# 8. Performance Floor Invariant

8.1 FPS floor MUST remain ≥ 55 on mid-tier hardware.  
8.2 No per-frame object allocations inside useFrame loops.  
8.3 Draw calls MUST be minimized.  
8.4 Debug helpers MUST not ship in production build.

Violation Impact:
- Visual stutter
- Reduced trust
- Scaling instability

---

# 9. Replay Compatibility Invariant

9.1 All symbolic objects MUST be reconstructable from stored state.  
9.2 Scene state MUST be serializable.  
9.3 No hidden UI-only state affecting symbolic layout.  
9.4 Replay mode MUST render identical symbolic geometry.

Violation Impact:
- Legal replay inconsistency
- Audit failure
- Narrative corruption

---

# Enforcement

All new PRs MUST:
- Reference applicable invariants
- Confirm no violations introduced
- Pass deterministic render test
- Pass org isolation test

Release Tag Condition:
SPATIAL_HOME_V1_LOCK requires zero invariant violations.

