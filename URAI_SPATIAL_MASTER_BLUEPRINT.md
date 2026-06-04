# URAI Spatial Master Blueprint

## Canon

URAI Spatial is a living 3D atlas of a person's life: stars above as memory doors, places below as lived worlds, realms beyond as meaning layers, and the Council guiding memory, recovery, identity, privacy, and becoming.

Before modifying code, read this document. If a requested change conflicts with this document, preserve this document's canon unless Adam Clamp explicitly updates the canon.

## Non-negotiables

1. True 3D is the primary product surface.
2. 2.5D is fallback only.
3. Stars are doors, not dead-end cards.
4. Every important memory can open into a place.
5. Places can contain objects, echoes, replays, privacy explanations, and exits.
6. Places can connect into larger memory worlds.
7. Realms are meaning layers: Mirror, Shadow, Legacy, Passport, Council, Dream.
8. Location is private by default.
9. Sensitive places and realms must be gated.
10. Every scene must have an exit path.
11. Every generated object must have a privacy level.
12. Every data-driven visual must have a fallback.
13. Every export must pass privacy redaction.
14. No debug/demo language ships in Genesis mode.
15. No primary route may render the 2.5D shell.

## Route contract

Primary routes must render the canonical true 3D Genesis experience:

```text
/                         TierOneExperience mode="home"
/home                     TierOneExperience mode="home"
/spatial                  TierOneExperience mode="home"
```

Fallback route:

```text
/spatial-fallback         UraiV1Experience mode="home"
```

Core spatial routes:

```text
/ascent                   Sky-to-LifeMap transition
/life-map                 3D Memory Galaxy
/focus                    Selected memory focus chamber
/replay                   Memory replay theater
/place/[placeId]          Navigable memory place
/location-map             Place/location atlas
```

Realm routes:

```text
/mirror                   Mirror Realm
/shadow                   Shadow Realm
/legacy                   Legacy Realm
/passport                 Passport Realm
/council                  Council Realm
/dream                    Dream Realm
/ground                   Ground Sanctuary
```

Future immersive routes:

```text
/xr                       XR entry
/xr/home                  XR Home
/xr/life-map              XR LifeMap
/xr/place/[placeId]       XR Memory Place
/xr/council               XR Council
/xr/replay                XR Replay
```

## Product hierarchy

```text
Home World
  Orb
  Ground
  Sky
  Mood Weather
  Portal access

LifeMap Galaxy
  Memory Stars
  Life Chapters
  Relationship Constellations
  Star Doorways

Location Map
  City/place clusters
  Home/work/nature places
  Relationship places
  Place doorways

Memory Places
  Real place reconstructions
  Symbolic places
  Hybrid places
  Interactive objects
  Place replays

Memory Worlds
  Seasons
  Relationships
  Recovery cycles
  Shadow patterns
  Legacy chapters

Realms
  Mirror
  Shadow
  Legacy
  Passport
  Council
  Dream
```

## Memory Places rule

Memory stars are not the memory. Memory stars are doorways. The memory lives in a place.

A memory place can be:

```text
real        approximate real-world reconstruction
symbolic    emotional/dream reconstruction
hybrid      real layout cues plus symbolic emotional overlays
```

Default location precision is symbolic or approximate. Exact addresses and coordinates must never render, narrate, or export unless the user explicitly opts in.

## Core schemas

### MemoryStar

```ts
type MemoryStar = {
  id: string;
  userId: string;
  title: string;
  summary: string;
  date: string;
  emotionalTone: string;
  emotionalIntensity: number;
  auraColor: string;
  position: [number, number, number];
  orbitGroup: string;
  orbitDistance: number;
  orbitSpeed: number;
  memoryPlaceId?: string;
  canEnterPlace: boolean;
  replayManifestId?: string;
  memoryWorldId?: string;
  chapterId?: string;
  relationshipIds?: string[];
  privacyLevel: "private" | "sensitive" | "shareable" | "demo";
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

### MemoryPlace

```ts
type MemoryPlace = {
  id: string;
  userId: string;
  title: string;
  memoryIds: string[];
  kind: "real" | "symbolic" | "hybrid";
  category:
    | "home"
    | "bedroom"
    | "street"
    | "car"
    | "school"
    | "workplace"
    | "hospital"
    | "restaurant"
    | "airport"
    | "nature"
    | "water"
    | "hotel"
    | "office"
    | "event"
    | "unknown";
  locationPrivacy:
    | "hidden"
    | "symbolic-only"
    | "city-only"
    | "approx-private"
    | "exact-private"
    | "exact-share-opt-in";
  reconstruction: {
    scenePreset: string;
    layoutPreset: string;
    terrainPreset: string;
    skyPreset: string;
    weatherPreset: string;
    lightingPreset: string;
    soundPreset: string;
    objectPackIds: string[];
  };
  emotionalOverlay: {
    mood: string;
    intensity: number;
    auraColor: string;
    fogLevel: number;
    distortionLevel: number;
    bloomLevel: number;
    memoryEchoLevel: number;
  };
  navigation: {
    spawnPoint: [number, number, number];
    exitPortalPosition: [number, number, number];
    walkable: boolean;
    cameraMode: "walk" | "float" | "cinematic" | "orbit";
  };
  privacyLevel: "private" | "sensitive" | "shareable" | "demo";
  createdAt: string;
  updatedAt: string;
};
```

### PlaceObject

```ts
type PlaceObject = {
  id: string;
  memoryPlaceId: string;
  memoryId?: string;
  objectType:
    | "door"
    | "window"
    | "bed"
    | "chair"
    | "table"
    | "lamp"
    | "car-seat"
    | "road"
    | "tree"
    | "water"
    | "photo"
    | "phone"
    | "mirror"
    | "threshold"
    | "echo"
    | "person-silhouette"
    | "artifact"
    | "portal";
  label: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: number;
  emotionalMeaning?: string;
  interactionType: "inspect" | "replay" | "hear-echo" | "open-portal" | "none";
  privacyLevel: "private" | "sensitive" | "shareable" | "demo";
};
```

### SpatialExplanation

```ts
type SpatialExplanation = {
  objectId: string;
  objectType: string;
  reason: string;
  dataSources: string[];
  confidence: "low" | "medium" | "high";
  privacyLevel: string;
  controls: Array<"hide" | "disable" | "export" | "delete" | "explain" | "enter" | "replay">;
};
```

## Firestore structure

```text
users/{userId}/worldState/current
users/{userId}/moodStates/current
users/{userId}/weatherState/current
users/{userId}/terrainState/current
users/{userId}/orbState/current
users/{userId}/emotionalPhysics/current
users/{userId}/memoryStars/{memoryStarId}
users/{userId}/memoryPlaces/{memoryPlaceId}
users/{userId}/placeObjects/{placeObjectId}
users/{userId}/locationClusters/{clusterId}
users/{userId}/memoryPlaceConnections/{connectionId}
users/{userId}/memoryPlaceSceneStates/{memoryPlaceId}
users/{userId}/memoryPlaceTimelines/{timelineId}
users/{userId}/memoryPlaceLayers/{layerId}
users/{userId}/memoryWorlds/{memoryWorldId}
users/{userId}/relationshipFields/{relationshipFieldId}
users/{userId}/lifeChapters/{chapterId}
users/{userId}/portalStates/{portalId}
users/{userId}/councilAgents/{agentId}
users/{userId}/councilMessages/{messageId}
users/{userId}/replayManifests/{replayManifestId}
users/{userId}/replayBeats/{replayBeatId}
users/{userId}/passportPermissions/{permissionId}
users/{userId}/dataProvenance/{objectId}
users/{userId}/worldEvolutionEvents/{eventId}
users/{userId}/worldContinuity/current
users/{userId}/featureFlags/current
users/{userId}/runtimeMode/current
```

## Privacy rules

Location defaults:

```text
hidden
symbolic-only
city-only
approx-private
exact-private
exact-share-opt-in
```

Rules:

```text
Never show exact address by default.
Never export exact coordinates by default.
Sensitive locations are private by default.
Raw audio, raw text, raw email, raw photos, contact names, health, camera, and facial data are hidden by default.
Sensitive places require gates.
Exports require redaction.
```

Sensitive gates are required for hospital, grief, trauma, relationship conflict, shadow loops, health crisis, self-harm context, abuse context, and legal/financial sensitive contexts.

Gate options:

```text
Enter softly
Preview from doorway
Ask orb to summarize
Skip for now
Hide this place
Disable this category
```

## Required fallback behavior

```text
Firebase unavailable -> local fallback world state
Firestore empty -> local fallback world state
Asset missing -> symbolic placeholder
Memory place missing -> return to LifeMap with gentle message
Place object missing -> skip object
Replay missing -> static memory place
WebGL unavailable -> /spatial-fallback
Sensitive data unavailable -> private empty state
Narrator unsafe output -> safe fallback line
```

## Guardian tests

Required test groups:

```text
tests/guardian/route-canon.test.mjs
tests/guardian/true-3d-canon.test.mjs
tests/guardian/fallback-canon.test.mjs
tests/guardian/memory-place-canon.test.mjs
tests/guardian/location-privacy-canon.test.mjs
tests/guardian/portal-exit-canon.test.mjs
tests/guardian/sensitive-gate-canon.test.mjs
tests/guardian/export-redaction-canon.test.mjs
tests/guardian/narrator-safety-canon.test.mjs
tests/guardian/no-debug-copy-canon.test.mjs
tests/guardian/no-flattening-canon.test.mjs
```

Golden E2E flows:

```text
Home -> LifeMap -> Focus -> Enter Place -> Exit Home
Home -> LifeMap -> Replay -> Return
Location Map -> Memory Place -> Inspect Object -> Exit
Sensitive Place -> Safety Gate -> Preview -> Exit
WebGL failure -> 2.5D fallback
Firebase failure -> local fallback world
Export -> privacy redaction -> safe output
Shadow Realm -> gate -> exit safely
```

## Build order

```text
1. Canonical 3D route lock
2. /spatial-fallback route
3. Route guardian tests
4. Master blueprint docs
5. World-state schema and fallback
6. MemoryStar schema with memoryPlaceId and canEnterPlace
7. MemoryPlace schema
8. PlaceObject schema
9. Demo memory places
10. MemoryPlaceScene
11. /place/[placeId] route
12. /location-map route
13. Focus Chamber Enter Place action
14. LifeMap star -> Focus -> Enter Place flow
15. Location privacy rules
16. Sensitive place gate
17. Place object inspection
18. Place replay
19. World continuity
20. Portal registry
21. Scene registry
22. Passport Realm
23. Mirror Realm
24. Shadow Realm
25. Council Realm
26. Legacy Realm
27. Dream Realm
28. Narrator spatial context
29. Export redaction
30. XR entry path
```

## Codex task format

Every task must include:

```text
Goal:
Context:
Files to inspect:
Files to modify:
Files to create:
Do not change:
Implementation steps:
Acceptance criteria:
Tests to run:
Fallback behavior:
Privacy/safety requirements:
Definition of done:
```

Every Codex task must start with:

```text
Read URAI_SPATIAL_MASTER_BLUEPRINT.md first. Do not flatten URAI. Do not make 2.5D the default. Preserve true 3D as the primary product surface. Preserve privacy-by-default. Stars are doors into places. Places are living memory scenes. Every scene must have an exit. Every sensitive place must have a gate.
```

## Never-do list

```text
Never make /spatial render UraiV1Experience.
Never make stars dead-end cards.
Never expose exact location by default.
Never show raw private data in a memory place by default.
Never put Shadow, trauma, grief, or health-sensitive places behind casual one-tap entry.
Never ship debug/demo labels in Genesis mode.
Never create a realm without an exit path.
Never create a place without a privacy level.
Never create an export without a redaction pass.
Never make the world dependent on Firebase being available.
Never replace the 3D world with flat screens.
```

## Definition of complete E2E

URAI Spatial E2E is complete when:

```text
User opens /
True 3D Genesis Home loads
Orb appears
Sky/weather/terrain reflect world state or fallback
User enters LifeMap
Memory stars appear
User selects a star
Focus Chamber opens
User chooses Enter Place
Memory Place loads
User can move/float inside
Objects can be inspected
Replay can play inside the place
Orb/Council can explain why things exist
Privacy controls show data sources
User exits to LifeMap or Home
World remembers visit/completion
Fallback works if Firebase/WebGL/assets fail
```

## Final lock

URAI is not a list of memories. URAI is not a flat app. URAI is a private 3D life atlas.

The sky holds the stars. The stars open the doors. The doors lead into places. The places become worlds. The worlds become chapters. The realms reveal meaning. The Council guides the journey. Passport protects the user. Replay turns life into spatial cinema.
