# URAI Adaptive Sound — V1 Task Board

## STATUS LEGEND
- [ ] Not started
- [~] In progress
- [x] Complete

---

## PHASE 0 — REPO PREP
- [ ] T0.1 Create soundtrack folders
- [ ] T0.2 Install deps (tone, mitt)

---

## PHASE 1 — CONTRACTS
- [ ] T1.1 Define types.ts
- [ ] T1.2 Build event bus

---

## PHASE 2 — MAPPING
- [ ] T2.1 mapStateToMusic.ts
- [ ] T2.2 Scenario sanity checks

---

## PHASE 3 — NON-REPEAT
- [ ] T3.1 entropy + repetition helpers

---

## PHASE 4 — AUDIO ENGINE
- [ ] T4.1 pulse stem
- [ ] T4.2 harmony stem
- [ ] T4.3 texture stem
- [ ] T4.4 motif stem
- [ ] T4.5 engine lifecycle

---

## PHASE 5 — MEMORY (LOCAL)
- [ ] T5.1 sessionStore
- [ ] T5.2 signature capture wiring

---

## PHASE 6 — BRIDGE
- [ ] T6.1 state adapter
- [ ] T6.2 SoundtrackBridge component

---

## PHASE 7 — VISUAL SYNC
- [ ] T7.1 ambientPayload
- [ ] T7.2 visualSyncStore
- [ ] T7.3 useVisualSync hook
- [ ] T7.4 HomeEnvironment sync
- [ ] T7.5 SpatialScene fog sync

---

## PHASE 8 — UI / DEMO
- [ ] T8.1 floating controls
- [ ] T8.2 debug panel
- [ ] T8.3 state simulator

---

## PHASE 9 — TUNING
- [ ] T9.1 tune 5 core states
- [ ] T9.2 tune transitions
- [ ] T9.3 remove loop feel

---

## PHASE 10 — PROOF + FREEZE
- [ ] T10.1 run full demo sequence
- [ ] T10.2 pass v1 quality gate

---

## HARD RULES (DO NOT BREAK)
- no replay engine yet
- no taste learning yet
- no Firestore dependency
- no IoT / XR
- no exports
- no extra features beyond spec

---

## FINAL CHECK

V1 is DONE when:
- [ ] runs 10+ minutes without loop feel
- [ ] audio + visuals feel unified
- [ ] no dropouts or flicker
- [ ] signatures captured
- [ ] demo works cleanly
- [ ] turning it off feels noticeable
