# TIER1_LOCK_CHECKLIST

Status: NOT LOCKED until every required item below is marked PASS in one clean build.

Owner: ____________________  
Branch / Commit: ____________________  
Build ID / Tag: ____________________  
Date: ____________________  

---

## Purpose

Tier 1 is the narrow product lock for the core URAI spatial chain:

- Home
- Sky transit
- LifeMap
- Focus
- Replay

The standard is:

- one world
- one selected memory
- one deterministic camera logic
- zero ambiguous routing

If any part still feels like screens pretending to be a world, Tier 1 is not locked.

---

## Canonical state graph

Only the following graph is allowed:

- Home → Sky → LifeMap
- LifeMap → Focus
- Focus → Replay
- Replay → Focus
- Focus → LifeMap
- LifeMap → Home

### Hard rules

- No duplicate paths
- No silent reroutes
- No accidental intermediate flashes
- No state badge / label mismatch
- No direct route to a destination unless explicitly part of the canonical graph

---

# 0. Final signoff gate

Do **not** mark Tier 1 locked until all of these are true in the same build:

- [ ] All global invariants pass
- [ ] All five states pass
- [ ] All seven transitions pass
- [ ] Spam-click / reentry tests pass
- [ ] Selected-memory persistence tests pass
- [ ] One clean fullscreen capture shows the full canonical route with no ambiguity

**Tier 1 lock decision:** PASS / FAIL  
**Final reviewer:** ____________________  
**Date:** ____________________  
**Notes:** ________________________________________________

---

# 1. Global invariants

## 1.1 Canonical state graph

### Required
- [ ] Every allowed route exists
- [ ] No disallowed route occurs
- [ ] No accidental intermediate state flashes
- [ ] No state label disagrees with the visible scene

### Fail examples
- [ ] Home jumps directly to Focus without explicit rule
- [ ] Replay exits to Home unexpectedly
- [ ] Sky appears inconsistently with no deterministic rule
- [ ] Scene says one thing while state badge says another

### Acceptance test
Run the full path 10 times manually and record the visible state order.

Expected:
`Home → Sky → LifeMap → Focus → Replay → Focus → LifeMap → Home`

Run results:

1. ____________________
2. ____________________
3. ____________________
4. ____________________
5. ____________________
6. ____________________
7. ____________________
8. ____________________
9. ____________________
10. ____________________

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## 1.2 Single selected memory identity

### Required
- [ ] One memory ID is selected in LifeMap
- [ ] The same ID is shown in Focus
- [ ] The same ID is shown in Replay
- [ ] Exiting Replay returns to the same Focus memory
- [ ] Exiting Focus returns to the same LifeMap node

### Fail examples
- [ ] Title changes unexpectedly
- [ ] Orb / object looks detached from selected node
- [ ] Returning to map loses selection
- [ ] Replay content does not match selected memory

### Acceptance test
Pick 3 distinct nodes. For each:

`LifeMap → Focus → Replay → Focus → LifeMap`

Record:

- Node A: ____________________
- Node B: ____________________
- Node C: ____________________

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## 1.3 Input gating during transition

### Required
- [ ] During transition, extra clicks are ignored or safely queued
- [ ] Double click cannot produce a double transition
- [ ] Fast repeated taps do not corrupt state

### Fail examples
- [ ] Transition can be interrupted into a bad state
- [ ] Multiple overlays appear
- [ ] Scene and store drift apart

### Acceptance test
Spam-click during each transition for 5 runs.

Runs:
1. ____________________
2. ____________________
3. ____________________
4. ____________________
5. ____________________

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## 1.4 Scene-state synchronization

### Required
- [ ] Visual state, data state, label state, and selected object all agree
- [ ] No mismatch frame exists outside an intentional transition blend window

### Fail examples
- [ ] Focus label with Replay content
- [ ] LifeMap shown while state says Home
- [ ] Selected memory title differs from current orb

### Acceptance test
Record one clean run and review frame-by-frame around every transition.

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 2. State lock sheets

# 2.1 Home

## H1. Stable anchor scene

### Required
- [ ] Home composition is fixed and readable
- [ ] No jitter, layout shift, or idle drift bug
- [ ] Anchor orb / object has calm idle behavior
- [ ] Main actions are minimal and obvious

### Fail examples
- [ ] Looks like a webpage instead of a scene
- [ ] Idle state feels like a dead placeholder
- [ ] Elements jump on render or resize

### Acceptance test
Leave Home open for 60 seconds.

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## H2. Deterministic entry / exit

### Required
- [ ] Home → Sky always starts from the same framing
- [ ] LifeMap → Home always lands in the same framing
- [ ] No alternate hidden route fires

### Acceptance test
Enter and exit Home 10 times. Compare start / end framing.

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## H3. Visual role clarity

### Required
- [ ] Viewer can tell Home is the origin scene
- [ ] Anchor object visually belongs to the rest of the spatial system

### Fail examples
- [ ] Home feels disconnected from map / focus / replay world

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 2.2 Sky transit

## S1. Transit only

### Required
- [ ] Sky behaves like a motion corridor, not a modal page
- [ ] It has clear directionality and finite duration
- [ ] It never traps the user as a standalone stop

### Fail examples
- [ ] It reads like a centered card with a label
- [ ] It feels optional or random

### Acceptance test
Trigger Home → LifeMap and back 10 times.

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## S2. Motion readability

### Required
- [ ] User can feel forward movement
- [ ] Camera easing is intentional
- [ ] Background depth / parallax supports transit

### Fail examples
- [ ] Sky is mostly static with text overlay
- [ ] Motion is too short to register or too long to justify

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## S3. Rule consistency

Choose one rule and lock it:

- [ ] Option A: Sky always appears on both outbound and return
- [ ] Option B: Sky only appears on Home → LifeMap
- [ ] Option C: Sky is removed as a discrete state and becomes effect only

### Rule selected
________________________________________________

### Acceptance test
- [ ] The selected rule holds in all repeated runs

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 2.3 LifeMap

## L1. Field readability

### Required
- [ ] Stars / nodes are visibly present
- [ ] Near / mid / far depth is readable
- [ ] The map is not too dim to parse
- [ ] One selected node is unmistakable

### Fail examples
- [ ] Stars feel decorative
- [ ] Scene reads as black background plus bottom bar

### Acceptance test
Show LifeMap to a fresh viewer for 5 seconds.

Prompt: “What is this screen?”

Expected answer: selectable memory points / star map / memory field

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## L2. Selection clarity

### Required
- [ ] Hover state and selected state are distinct
- [ ] Selected node remains visually locked
- [ ] Entering Focus clearly comes from that node

### Fail examples
- [ ] User cannot tell what is selected
- [ ] Several nodes seem equally active

### Acceptance test
Hover and select 5 different nodes.

1. ____________________
2. ____________________
3. ____________________
4. ____________________
5. ____________________

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## L3. Persistence

### Required
- [ ] Returning from Focus restores the same selected node
- [ ] Camera framing on return is stable
- [ ] Node positions do not reshuffle

### Fail examples
- [ ] Map re-randomizes
- [ ] Selection clears
- [ ] Camera returns to generic center unrelated to prior node

### Acceptance test
Select node A, enter Focus, return. Repeat for B and C.

- Node A: ____________________
- Node B: ____________________
- Node C: ____________________

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## L4. Structure

### Required
- [ ] There is enough chapter / cluster logic to feel like a memory topology
- [ ] Viewer can sense grouping or narrative order

### Fail examples
- [ ] Map is just scattered points with no legible meaning

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 2.4 Focus

## F1. Object continuity

### Required
- [ ] Focus orb / object is clearly the selected LifeMap node brought near
- [ ] Same memory title and metadata appear
- [ ] Scale and position feel like approach, not replacement

### Fail examples
- [ ] Orb is generic
- [ ] Panel content feels unrelated to object

### Acceptance test
Capture the selected LifeMap node, then enter Focus and compare:

- color / glow
- title
- object signature
- position continuity

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## F2. Hero framing

### Required
- [ ] Camera settles into repeatable inspection framing
- [ ] Orb is dominant
- [ ] Side panel supports rather than replaces the object

### Fail examples
- [ ] Panel dominates
- [ ] Orb feels decorative

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## F3. Navigation integrity

### Required
- [ ] Focus → Replay always opens the current memory
- [ ] Focus → LifeMap always returns to the current node

### Acceptance test
Test both exits from 3 different memories.

- Memory A: ____________________
- Memory B: ____________________
- Memory C: ____________________

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 2.5 Replay

## R1. Entered-memory feel

### Required
- [ ] Replay feels more immersive than Focus
- [ ] Scene meaningfully changes, not just text card contents
- [ ] User understands they entered the memory

### Fail examples
- [ ] Replay is only a larger panel
- [ ] Spatial world disappears into UI

### Acceptance test
Show Focus and Replay side-by-side to a reviewer.

Expected reaction: Replay reads as inside / deeper / entered

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## R2. Identity continuity

### Required
- [ ] Replay title, content, and object match the Focus memory exactly
- [ ] Replay exit returns to the same Focus memory

### Fail examples
- [ ] Memory identity shifts
- [ ] Exiting Replay loses context

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## R3. Exit determinism

### Required
- [ ] Replay → Focus is clean and singular
- [ ] No Home flash
- [ ] No LifeMap flash
- [ ] No state badge mismatch

### Acceptance test
Run Replay exit 10 times.

1. ____________________
2. ____________________
3. ____________________
4. ____________________
5. ____________________
6. ____________________
7. ____________________
8. ____________________
9. ____________________
10. ____________________

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 3. Transition pass / fail sheet

Every transition below must pass all six checks:

- [ ] Start state clear
- [ ] End state clear
- [ ] Movement readable
- [ ] Selected memory preserved where applicable
- [ ] No accidental intermediate state
- [ ] No double-trigger bug

## T1. Home → Sky
- [ ] Home anchor clearly departs
- [ ] Sky begins immediately and intentionally
- [ ] No hard panel-swap feel

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## T2. Sky → LifeMap
- [ ] Arrival into map feels like reveal / approach
- [ ] Map becomes readable before interaction is allowed

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## T3. LifeMap → Focus
- [ ] Selected star is the causal source of Focus
- [ ] Camera / object scaling supports continuity

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## T4. Focus → Replay
- [ ] Replay reads as entering the same memory
- [ ] Not just a component swap

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## T5. Replay → Focus
- [ ] Returns to same memory
- [ ] Returns to same inspection state

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## T6. Focus → LifeMap
- [ ] Map returns with same node selected
- [ ] Regional framing is stable

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## T7. LifeMap → Home
- [ ] User clearly exits the map back to origin
- [ ] No leftover selection state leaks into Home

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 4. Engineering gates behind the visuals

## D1. One source of truth for state
- [ ] One state store owns scene mode
- [ ] One selected memory key exists
- [ ] One transition status flag exists
- [ ] One transition direction / type exists

### Fail examples
- [ ] Local component state and global state can disagree
- [ ] Multiple stores can independently set mode

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## D2. Transition locking
- [ ] A transition cannot be re-entered before settle
- [ ] Completion callback clears lock reliably
- [ ] Cancel logic is explicit if used

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## D3. Stable render keys
- [ ] Scene objects do not remount unnecessarily on state change
- [ ] Selected memory object keeps stable identity where needed

### Fail examples
- [ ] Key churn causes teleport or pop

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## D4. Deterministic data order
- [ ] LifeMap node ordering is deterministic
- [ ] Placement is deterministic
- [ ] Same build / session yields the same arrangement unless explicitly reseeded

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

## D5. Camera ownership
- [ ] One system owns camera intent at a time
- [ ] No simultaneous animation systems compete

### Fail examples
- [ ] Orbit controls, scripted motion, and state effects fight each other

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 5. Demo readiness gate

Tier 1 is not presentation-ready until all of the following pass:

- [ ] Fullscreen capture
- [ ] No OBS visible
- [ ] No browser chrome if avoidable
- [ ] No debug overlays unless intentionally styled
- [ ] One clean 20–40 second canonical run

## Canonical demo path
`Home → Sky → LifeMap → select memory → Focus → Replay → Focus → LifeMap → Home`

### Demo review
- [ ] The whole path feels inevitable
- [ ] The same memory persists through map / focus / replay
- [ ] Nothing looks accidental
- [ ] Nothing looks like a fake panel swap

**Result:** PASS / FAIL  
**Notes:** ________________________________________________

---

# 6. Execution order

Work in this order only:

1. [ ] Lock state graph
2. [ ] Lock selected-memory persistence
3. [ ] Lock transition gating
4. [ ] Make LifeMap readable
5. [ ] Make LifeMap → Focus causal
6. [ ] Make Replay feel entered, not swapped
7. [ ] Finalize Home / Sky polish
8. [ ] Record clean canonical capture

---

# 7. Success definition

A first-time viewer should be able to say:

> I started at a home scene, traveled into a sky/map space, picked a memory star, inspected it, entered it, came back out, and returned home. It all felt like one world.

If that statement is not true, Tier 1 is not locked.

---

# 8. Reviewer log

## Review pass 1
Reviewer: ____________________  
Date: ____________________  
Result: PASS / FAIL  
Notes: ________________________________________________

## Review pass 2
Reviewer: ____________________  
Date: ____________________  
Result: PASS / FAIL  
Notes: ________________________________________________

## Review pass 3
Reviewer: ____________________  
Date: ____________________  
Result: PASS / FAIL  
Notes: ________________________________________________
