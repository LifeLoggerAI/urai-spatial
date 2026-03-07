# URAI-SPATIAL

**The 3D / XR rendering engine for the Life Operating System.**

URAI-Spatial is not just a starfield demo. It is a real-time, data-driven, cinematic spatial engine designed to visualize and experience the vast landscape of a person's digital life. It is the core rendering layer for the URAI Life Operating System, creating a persistent, explorable space from the sum of your digital existence.

Its purpose is not to present data, but to create a sense of place. It is a silent world, free of explicit narration, designed to be explored, not explained. It's a space for reflection, where the patterns of your life become visible as celestial phenomena.

## V1.0.0 Status: Founder Lock & Tier-1 Completion

Phase A (Determinism Lock) has been completed, and the repository now contains governance documents defining the constraints for URAI-Spatial V1.0.0. This marks a shift from early experimentation toward a controlled architecture. The key points are the architectural guardrails rather than a list of functional features.

The identity statement establishes that URAI-Spatial V1 is a **visual reflection system**, not a forecasting or simulation engine. This has two technical implications:
1.  The system must treat stored events as immutable inputs rather than something the engine alters or predicts from.
2.  Rendering logic must remain deterministic so the same inputs always produce the same spatial output.

The architectural mandates reinforce this. A deterministic core means the starfield layout, camera motion, and memory rendering must be reproducible from the same state. A one-way data flow means the spatial viewer should read structured data (for example star positions and memory metadata) but not synthesize new behavioral insights or predictive results. That constraint simplifies the engine and also aligns with the “low-risk” posture mentioned in the document.

The governance statement about **Founder Lock** is essentially a branch control rule. It means the V1 branch is intended to remain stable and resistant to feature expansion. In practical terms, development should now move into verification and completion of the existing Tier-1 spatial loop rather than introducing additional capabilities.

### Next Steps: Tier-1 Verification

From a systems perspective, if Phase A is truly finished, the next technical verification should focus on four areas:

1.  **Deterministic Rendering Pipeline:** The starfield generation, star selection behavior, and camera motion must produce identical results across reloads when the same state is provided.
2.  **Complete Interaction Loop:** The engine should reliably execute the sequence: starfield view → star selection → camera glide → memory sphere → replay view → return to starfield.
3.  **State Reconstruction:** Reloading the scene while `spatialMode` and `selectedStarId` are set should recreate the exact visual state without manual intervention.
4.  **Replay Isolation:** Entering replay or memory mode must prevent additional star selections and must not mutate the lifemap state.

If those conditions hold, the system can be considered close to a stable **URAI-Spatial V1 Tier-1 engine**. If any of them fail, the fixes should occur before further locking of the branch.
