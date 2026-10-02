# URAI Real Place Capture Standard V1

Status: CURRENT CAPTURE STANDARD / PRIVATE-BY-DEFAULT / SOURCE-TRUTH PRESERVING

## Goal

Capture enough truthful visual evidence to reconstruct a real place while keeping original source, reconstructed geometry, memory interpretation, people, audio and exact location as separate governed evidence classes.

## Mandatory rule

The original capture is immutable source authority. A proxy, extracted frame, camera solution, Gaussian splat, mesh, texture, generated fill or repaired surface is a derivative and must never replace or silently overwrite the original.

## Capture passes

### 1. Geometry pass

Use this pass for the place itself.

- Remove avoidable moving people and pets from the geometry pass.
- Prefer bright, stable, even lighting.
- Avoid abrupt exposure changes.
- Move slowly enough to minimize motion blur.
- Walk through the space; do not capture only from a single pivot like a panorama.
- Maintain strong overlap between consecutive views.
- Observe major walls, floor/ground, ceiling where relevant, doors, windows, fixed furniture and transition geometry from multiple angles.
- Cross doorways, gates, hallways and corners from both directions.
- On stairs, capture approach, climb/descent and landing geometry.
- For exteriors, circle important structures where safe and cover facade-to-ground transitions.
- Avoid long stretches aimed only at textureless sky, blank walls or reflective glass.

### 2. Object-detail pass

Capture meaningful stationary objects separately when the wide geometry pass cannot preserve enough detail. Object evidence does not grant likeness or voice authority for people shown nearby.

### 3. Ambient-audio pass

Record room tone, environmental sound or other ambient audio separately when useful. Audio is not required to reconstruct visual geometry.

### 4. People/story pass

Record recognizable people, voices and stories only through the appropriate likeness/voice authority. Do not contaminate base place geometry with a recognizable person merely to make the scene feel alive.

## Interior checklist

Cover:

- every wall plane;
- floor transitions;
- doorway frames;
- room-to-room transitions;
- hallways from both directions;
- corners from more than one viewing angle;
- stairs and landings;
- large fixed furniture;
- reflective surfaces with extra surrounding context;
- windows from inside and, where safe, from outside;
- important occluded areas with a second pass.

## Exterior / route checklist

Cover:

- building perimeter where safe;
- driveway/walkway;
- gates/fences;
- curb/street transition only when privacy policy permits;
- trees/landscaping that provide stable spatial anchors;
- route turns;
- approach and departure views;
- turnaround points;
- return path;
- transitions back into the building.

Exact addresses and identifying neighboring details are not public launch material.

## Motion / overlap

A capture is not automatically reconstruction-ready because it is high resolution.

Reject or reshoot when there is:

- severe motion blur;
- long low-overlap jumps;
- large unobserved rooms or transitions;
- dominant moving crowds/pets;
- exposure pumping that destroys surface detail;
- reflective-only evidence with no stable surrounding geometry;
- disconnected capture islands;
- orientation ambiguity;
- insufficient return views around corners.

## Privacy before reconstruction

Before frames enter reconstruction:

1. verify owner/source authority;
2. classify exact-location sensitivity;
3. identify third-party people;
4. identify minors/dependents;
5. identify readable mail/documents/screens/license plates where relevant;
6. remove or mask unauthorized material in a derivative, never by altering the source;
7. record the transformation in provenance.

## Reconstruction-readiness states

- `ready`: source integrity verified, coverage coherent, privacy screen complete.
- `conditional`: useful evidence exists but known gaps must remain bounded.
- `reshoot-required`: evidence is insufficient for an autobiographical spatial claim.
- `blocked-privacy`: source cannot proceed until required authority exists.
- `unknown`: not inspected yet.

## Reshoot order

When a reconstruction has a gap, reshoot the missing transition or surface rather than asking generation to invent it. Generated fill is interpretive and must remain labeled as such.

## User experience principle

The target reaction is recognition: “that is my place.” Visual polish must never outrank autobiographical truth.
