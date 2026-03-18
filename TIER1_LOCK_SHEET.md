Use this as the Tier 1 engineering lock sheet.

Treat every item as binary: PASS or FAIL. No “mostly.” No “good enough.” If one required item fails, Tier 1 is not locked.

# Tier 1 lock sheet

## A. Global invariants

These must pass before state-level signoff matters.

### A1. Canonical state graph

Required graph only:

Home → Sky → LifeMap
LifeMap → Focus
Focus → Replay
Replay → Focus
Focus → LifeMap
LifeMap → Home

Pass if:

* Every allowed route exists
* No disallowed route occurs
* No accidental intermediate state flashes
* No state label disagrees with the visible scene

Fail if:

* Home jumps directly to Focus without explicit rule
* Replay exits to Home unexpectedly
* Sky appears inconsistently with no deterministic rule
* State badge says one thing while scene shows another

Acceptance test:

* Run full path 10 times manually
* Log actual visible state order each run
* All 10 runs must match expected order exactly

### A2. Single selected memory identity

Pass if:

* One memory ID is selected in LifeMap
* The same ID is shown in Focus
* The same ID is shown in Replay
* Exiting Replay returns to the same Focus memory
* Exiting Focus returns to the same LifeMap node

Fail if:

* Title changes unexpectedly
* Orb/object looks detached from selected node
* Returning to map loses selection
* Replay content does not match selected memory

Acceptance test:

* Pick 3 distinct nodes
* For each: LifeMap → Focus → Replay → Focus → LifeMap
* Verify ID/title/position continuity for all 3

### A3. Input gating during transition

Pass if:

* During transition, extra clicks are ignored or queued safely
* Double click cannot produce double transition
* Fast repeated taps do not corrupt state

Fail if:

* Transition can be interrupted into a bad state
* Multiple overlays appear
* Scene and state store drift apart

Acceptance test:

* Spam click during each transition for 5 runs
* System must still settle into one valid destination every time

### A4. Scene-state synchronization

Pass if:

* Visual state, data state, label state, and selected object all agree
* No frame range shows mismatch between panel content and scene identity

Fail if:

* Focus label with Replay content
* LifeMap shown while state says Home
* Selected memory title differs from current orb

Acceptance test:

* Record one clean run
* Review frame-by-frame at every transition
* No mismatch frame allowed beyond intentional crossfade window

## B. State lock sheets

## 1. Home

### H1. Stable anchor scene

Pass if:

* Home composition is fixed and readable
* No jitter, layout shift, or idle drift bug
* Anchor orb/object has calm idle behavior
* Main actions are minimal and obvious

Fail if:

* Looks like a webpage instead of a scene
* Idle state has dead still placeholder feel
* Elements jump on render or resize

Acceptance test:

* Leave Home open 60 seconds
* Resize once if responsive behavior matters
* No layout jump, no flicker, no disappearing objects

### H2. Deterministic entry/exit

Pass if:

* Home → Sky always starts from the same framing
* LifeMap → Home always lands in same framing
* No alternate hidden route fires

Acceptance test:

* Enter/exit Home 10 times
* Compare start/end composition visually
* Must look identical within intentional motion variance

### H3. Visual role clarity

Pass if:

* Viewer can tell Home is origin, not destination content
* The anchor object visually belongs to the spatial system

Fail if:

* Home feels disconnected from map/focus/replay world

## 2. Sky transit

### S1. Transit only

Pass if:

* Sky behaves like motion corridor, not modal page
* It has clear directionality and finite duration
* It never traps the user as a standalone stop

Fail if:

* It reads like a centered card with a label
* It feels optional or random

Acceptance test:

* Trigger Home → LifeMap and back 10 times
* Sky timing and motion must be consistent every run

### S2. Motion readability

Pass if:

* User can feel forward movement
* Camera easing is intentional
* Background depth/parallax supports transit

Fail if:

* Sky is mostly static with text overlay
* Motion is too short to register or too long to justify

### S3. Rule consistency

Choose one and lock it:

* Option A: Sky always appears on both outbound and return
* Option B: Sky only appears on Home → LifeMap
* Option C: Sky is removed as discrete state and becomes effect only

Fail if:

* Rule changes from run to run

## 3. LifeMap

### L1. Field readability

Pass if:

* Stars/nodes are visibly present
* Near/mid/far depth is readable
* The map is not too dim to parse
* One selected node is unmistakable

Fail if:

* Stars feel decorative
* Scene reads as black background plus bottom bar

Acceptance test:

* Show LifeMap to a fresh viewer for 5 seconds
* They should be able to say “these are selectable memory points”

### L2. Selection clarity

Pass if:

* Hover state and selected state are distinct
* Selected node remains visually locked
* Entering Focus clearly comes from that node

Fail if:

* User cannot tell what is selected
* Several nodes seem equally active

Acceptance test:

* Hover/select 5 different nodes
* Each selection must produce a clear, unique visual response

### L3. Persistence

Pass if:

* Returning from Focus restores same selected node
* Camera framing on return is stable
* Node positions do not reshuffle

Fail if:

* Map re-randomizes
* Selection clears
* Camera returns to generic center unrelated to prior node

Acceptance test:

* Select node A, enter Focus, return
* Repeat for nodes B and C
* Exact node remains selected each time

### L4. Structure

Pass if:

* There is enough chapter/cluster logic to feel like a memory topology
* Viewer can sense grouping or narrative order

Fail if:

* Map is just scattered points with no legible meaning

## 4. Focus

### F1. Object continuity

Pass if:

* Focus orb/object is clearly the selected LifeMap node brought near
* The same memory title and metadata appear
* Object scale and position feel like approach, not replacement

Fail if:

* Orb is generic
* Panel content feels unrelated to object

Acceptance test:

* Capture LifeMap selected node, then Focus
* Compare color/glow/title/object signature
* Must read as same memory in a new distance band

### F2. Hero framing

Pass if:

* Camera settles into repeatable inspection framing
* Orb is dominant
* Side panel supports rather than replaces the object

Fail if:

* Panel dominates
* Orb feels decorative

### F3. Navigation integrity

Pass if:

* Focus → Replay always opens current memory
* Focus → LifeMap always returns to current node

Acceptance test:

* From 3 different memories, test both exits repeatedly
* No route confusion allowed

## 5. Replay

### R1. Entered-memory feel

Pass if:

* Replay feels more immersive than Focus
* Scene meaningfully changes, not just text card contents
* User understands they entered the memory

Fail if:

* Replay is only a larger panel
* Spatial world disappears into UI

Acceptance test:

* Show Focus and Replay side by side to reviewer
* Reviewer should immediately describe Replay as “inside” or “deeper”

### R2. Identity continuity

Pass if:

* Replay title, content, and object match Focus memory exactly
* Replay exit returns to same Focus memory

Fail if:

* Memory identity shifts
* Exiting Replay loses context

### R3. Exit determinism

Pass if:

* Replay → Focus is clean and singular
* No Home flash
* No LifeMap flash
* No state badge mismatch

Acceptance test:

* Run Replay exit 10 times
* Same destination every time

# C. Transition pass/fail sheet

Each transition below must pass all 6 checks:

1. Start state clear
2. End state clear
3. Movement readable
4. Selected memory preserved
5. No intermediate accidental state
6. No double-trigger bug

## T1. Home → Sky

Pass if:

* Home anchor clearly departs
* Sky begins immediately and intentionally
* No hard panel swap feel

## T2. Sky → LifeMap

Pass if:

* Arrival into map feels like reveal/approach
* Map becomes readable before interaction allowed

## T3. LifeMap → Focus

Pass if:

* Selected star is the causal source of Focus
* Camera/object scaling supports continuity

This is one of the most important lock points.

## T4. Focus → Replay

Pass if:

* Replay reads as entering the same memory, not swapping components

## T5. Replay → Focus

Pass if:

* Returns to same memory and same inspection state

## T6. Focus → LifeMap

Pass if:

* Map returns with same node selected and same regional framing

## T7. LifeMap → Home

Pass if:

* User clearly exits the spatial map back to origin
* No leftover selection state leaks into Home visuals

# D. Engineering checks behind the visuals

These are the likely implementation gates that must be true.

## D1. One source of truth for state

Pass if:

* One state store owns scene mode
* One selected memory key
* One transition status flag
* One transition direction/type

Fail if:

* Local component state and global state can disagree
* Multiple stores can independently set mode

## D2. Transition locking

Pass if:

* A transition cannot be re-entered before settle
* Completion callback clears lock reliably
* Cancel logic is explicit if used

## D3. Stable render keys

Pass if:

* Scene objects do not remount unnecessarily on state change
* Selected memory object keeps stable identity where needed

Fail if:

* Key churn causes teleport or pop

## D4. Deterministic data order

Pass if:

* LifeMap node ordering and placement are deterministic
* Same build/session yields same arrangement unless explicitly seeded otherwise

## D5. Camera ownership

Pass if:

* One system owns camera intent at a time
* No simultaneous animation systems compete

Fail if:

* Orbit controls, scripted motion, and state effects all fight each other

# E. Demo readiness gate

Tier 1 is not presentation-ready until this passes.

Pass if:

* Fullscreen capture
* No OBS visible
* No browser chrome if avoidable
* No debug overlays unless intentionally styled
* One clean 20–40 second canonical run

Canonical demo path:
Home → Sky → LifeMap → select memory → Focus → Replay → Focus → LifeMap → Home

The whole path should feel inevitable.

# F. Hard signoff rule

You can say “Tier 1 locked” only if all of these are true in one build:

* All global invariants pass
* All five states pass
* All seven transitions pass
* Spam-click tests pass
* Selection persistence tests pass
* One clean capture shows no ambiguity

# G. Suggested work order

Do it in this exact sequence:

1. Lock state graph
2. Lock selected memory persistence
3. Lock transition gating
4. Make LifeMap readable
5. Make LifeMap → Focus causal
6. Make Replay feel entered, not swapped
7. Finalize Home/Sky polish
8. Record clean canonical capture

# H. What success should look like

When Tier 1 is actually locked, a first-time viewer should be able to say:

“I started at a home scene, traveled into a sky/map space, picked a memory star, inspected it, entered it, came back out, and returned home. It all felt like one world.”

That is the standard.
