# URAI-Spatial Safety Checklist

This document outlines the non-negotiable safety and design principles that govern the URAI-Spatial experience. All features and contributions MUST adhere to this checklist.

## 1.0 Data Sovereignty & Consent

- [ ] **1.1 User-Initiated Actions:** All actions that involve data access, analysis, or sharing are initiated by the user.
- [ ] **1.2 Explicit, Ceremonial Consent:** Consent for any data sharing is explicit, ceremonial, and revocable. The user is always made fully aware of what they are sharing.
- [ ] **1.3 Revocable Consent:** The user can revoke any consent at any time, and the system immediately and permanently honors that revocation.
- [ ] **1.4 Privacy by Default:** The user's experience is private by default. No data is public or shared without explicit consent.

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
