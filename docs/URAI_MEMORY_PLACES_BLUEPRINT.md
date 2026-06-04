# URAI Memory Places Blueprint

Memory Places are first-class destinations inside URAI Spatial.

## Core rule

```text
Memory stars are not the memory. Memory stars are doorways. The memory lives in a place.
```

## Place types

```text
real        approximate real-world reconstruction
symbolic    emotional or dreamlike reconstruction
hybrid      real layout cues plus symbolic overlays
```

## Primary flow

```text
Home
-> LifeMap
-> Select Memory Star
-> Focus Chamber
-> Enter Place
-> MemoryPlaceScene
-> Inspect objects / replay / ask orb / exit
```

## Required MemoryStar additions

```ts
memoryPlaceId?: string;
canEnterPlace: boolean;
```

## Required MemoryPlace fields

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

## Required PlaceObject fields

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

## Place categories

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

## Place presets

Starter presets:

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

## Object types

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

## Place layers

A place may eventually support:

```text
real layer
emotional layer
symbolic layer
timeline layer
future/recovery layer
legacy layer
shadow layer
```

## Navigation modes

```text
walk
float
cinematic
orbit
```

## Privacy defaults

Default memory places should be symbolic, city-level, or approximate. Exact location must not render by default.

Allowed locationPrivacy values:

```text
hidden
symbolic-only
city-only
approx-private
exact-private
exact-share-opt-in
```

## Memory Place scene states

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

## Fallback rules

```text
Missing place -> return to LifeMap or show symbolic safe place.
Missing object -> skip object.
Missing replay -> render static place.
Missing privacy level -> treat as private.
Unclear location precision -> downgrade to symbolic-only.
```

## Place replay

Replay should happen inside the place. Replay beats may target place objects.

Example:

```text
Enter memory room
-> phone object glows
-> window weather shifts
-> echo appears
-> bloom opens
-> orb explains why this place exists
```

## Location Map

LifeMap answers when and what. Location Map answers where.

Location Map should support:

```text
place clusters
city/place categories
home/work/nature anchors
relationship places
travel chapters
place doorways
```

## First implementation tasks

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
