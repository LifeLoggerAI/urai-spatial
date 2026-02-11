# URAI-Spatial Safety Checklist

This checklist is used to verify that the `urai-spatial` system adheres to its core design principles of safety, intentionality, and non-extractive design.

## 1.0 Navigation & Camera

- [ ] **1.1 Bounded Camera:** Camera movement is constrained and never infinite. The user cannot pan or travel into empty, undefined space.
- [ ] **1.2 Intentional Navigation:** User cannot "free roam." Movement is restricted to defined paths or nodes.
- [ ] **1.3 Guaranteed Exit:** Every spatial scene has a clearly defined and functional "exit" or "return" affordance.
- [ ] **1.4 No Traps:** No possible navigation state results in a dead-end, inescapable loop, or visual trap.
- [ ] **1.5 Reversible Transitions:** All scene transitions are deterministic and cleanly reversible.

## 2.0 Replay Semantics

- [ ] **2.1 Explicit Entry:** Entry into a memory replay is an explicit, user-initiated action.
- [ ] **2.2 Sacred Pacing:** Replay pacing is controlled by the system. No user controls for fast-forward, rewind, or scrubbing are permitted.
- [ ] **2.3 Uninterruptible Replay:** Once initiated, a memory replay cannot be interrupted by other UI or spatial interactions.
- [ ] **2.4 Consistent State on Exit:** Exiting a replay returns the user to a known, safe, and consistent state.

## 3.0 Interaction Vocabulary

- [ ] **3.1 Locked Vocabulary:** User interactions are strictly limited to "gaze," "select," and "exit."
- [ ] **3.2 No Social Features:** No features for social interaction (chat, avatars, presence indicators) are present.
- [ ] **3.3 No Gamification:** No gamification mechanics (scores, points, achievements, streaks) are present.
- [ ] **3.4 Invariant Compliance:** The user-facing experience fully respects the invariants defined in `SPATIAL_LOCK.md`.
