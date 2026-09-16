# URAI Memory Places Blueprint

> **STATUS — SUPERSEDED / PROVENANCE ONLY (2026-09-16).** This document preserves the earlier Memory Places design lineage. It is **not** current runtime or product authority. Current personalized terrestrial authority is `docs/URAI_PERSONALIZED_LIVED_WORLD_AUTHORITY_V1.md` plus `docs/URAI_GROUND_DEFINITIVE_CANON_V1.md`. Ordinary user flows must not substitute bundled demo `MemoryPlaceScene` / symbolic portal rooms for personal autobiography. Current semantics are Ground = where life happened, Focus = which memory is examined, Replay = what happened over time. Explicit `demo=1` sample routes may retain this historical scene only as clearly disclosed demo/provenance behavior.

Memory Places were originally defined as first-class destinations inside URAI Spatial. The material below is retained to explain historical schemas, tests, and demo assets that still exist in the repository.

## Historical core rule

```text
Memory stars are not the memory. Memory stars are doorways. The memory lives in a place.
```

## Historical place types

```text
real        approximate real-world reconstruction
symbolic    emotional or dreamlike reconstruction
hybrid      real layout cues plus symbolic overlays
```

## Historical primary flow — superseded

```text
Home
-> LifeMap
-> Select Memory Star
-> Focus Chamber
-> Enter Place
-> MemoryPlaceScene
-> Inspect objects / replay / ask orb / exit
```

Current personal flow does **not** use this symbolic room chain as ordinary autobiographical truth. Ground owns the lived-world place layer and carries source-backed memory context into Focus/Replay.

## Historical MemoryStar additions

```ts
memoryPlaceId?: string;
canEnterPlace: boolean;
```

These fields may remain for disclosed demo/provenance compatibility; they do not by themselves authorize a personal place reconstruction.

## Historical MemoryPlace fields

```text
id
userId
title
memoryIds
kind
category
locationPrivacy
reconstruction
emotionalOverlay
navigation
privacyLevel
createdAt
updatedAt
```

## Historical PlaceObject fields

```text
id
memoryPlaceId
objectType
label
position
scale
interactionType
privacyLevel
```

## Historical place categories

```text
home
bedroom
street
car
school
workplace
hospital
restaurant
airport
nature
water
hotel
office
event
unknown
```

## Historical place presets

```text
apartment-bedroom
childhood-bedroom
kitchen-memory
living-room-memory
car-interior
school-hallway
hospital-room
office-after-hours
restaurant-table
airport-terminal
city-street-night
suburban-street
forest-trail
lake-edge
beach-memory
hotel-room
founder-workspace
empty-room-symbolic
threshold-hallway
moonlit-memory-room
recovery-garden-place
```

These presets are not acceptable substitutes for source-backed personal places in current Ground.

## Historical object types

```text
door
window
bed
chair
table
lamp
car-seat
road
tree
water
photo
phone
mirror
threshold
echo
person-silhouette
artifact
portal
```

Portal-era object language is historical and is rejected for ordinary Ground entry/current lived-world memory activation.

## Historical place layers

```text
real layer
emotional layer
symbolic layer
timeline layer
future/recovery layer
legacy layer
shadow layer
```

## Historical navigation modes

```text
walk
float
cinematic
orbit
```

Current Ground ordinary desktop/mobile navigation is first-person camera-only and does not inherit symbolic OrbitControls/portal-room ownership from this blueprint.

## Privacy lineage

The historical default was symbolic/city/approximate with exact location hidden. Current authority is stricter: C3 governs location context; confirmed/partial/unknown reconstruction fidelity must remain explicit; generated detail may not be presented as observed memory; demo data may not substitute for unavailable private data; third-party/biometric/sensitive-inference rules are separate.

Historical locationPrivacy values:

```text
hidden
symbolic-only
city-only
approx-private
exact-private
exact-share-opt-in
```

## Historical scene states

```text
loading
ready
missing
locked
sensitive-gated
replay-active
object-focused
exiting
fallback
```

## Historical fallback rules — superseded where they synthesize personal place

```text
Missing place -> return to LifeMap or show symbolic safe place.
Missing object -> skip object.
Missing replay -> render static place.
Missing privacy level -> treat as private.
Unclear location precision -> downgrade to symbolic-only.
```

Current rule: missing personal place evidence fails closed or remains clearly non-personal/unknown. It must not silently open a symbolic sample room as the user's memory.

## Historical place replay

The old design replayed inside a symbolic place and targeted place objects.

Example lineage:

```text
Enter memory room
-> phone object glows
-> window weather shifts
-> echo appears
-> bloom opens
-> orb explains why this place exists
```

Current authority instead requires place-bound memories to emerge environmentally in Ground, then hand source/provenance/context into Focus and Replay without glowing pickup/portal language.

## Location Map lineage

Historical framing: LifeMap answers when/what; Location Map answers where.

Historical ideas included:

```text
place clusters
city/place categories
home/work/nature anchors
relationship places
travel chapters
place doorways
```

Current Location Map remains a separate consent-gated private-place support surface and must not be aliased to the public Global Emotional Field globe.

## Historical implementation task list

```text
1. Add MemoryPlace schema.
2. Add PlaceObject schema.
3. Add LocationCluster schema.
4. Add demo MemoryPlace data.
5. Add MemoryPlaceScene.
6. Add /place/[placeId] route.
7. Add /location-map route.
8. Add memoryPlaceId and canEnterPlace to MemoryStar.
9. Add Enter Place action to Focus Chamber.
10. Add privacy rules and tests.
```

These tasks document provenance only. Current ordinary `/place/...` routes fail closed unless a validated personalized provider exists; bundled historical samples require explicit `demo=1` disclosure.
