# Codex Execution Prompts

Every Codex task for URAI Spatial must begin with this anti-drift instruction:

```text
Read URAI_SPATIAL_MASTER_BLUEPRINT.md first. Do not flatten URAI. Do not make 2.5D the default. Preserve true 3D as the primary product surface. Preserve privacy-by-default. Stars are doors into places. Places are living memory scenes. Every scene must have an exit. Every sensitive place must have a gate.
```

## Required task format

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

## T001: Route lock

Goal:
Make `/spatial` render the canonical true 3D Genesis scene and keep the old 2.5D shell only at `/spatial-fallback`.

Files to inspect:

```text
urai-tier1/src/app/page.tsx
urai-tier1/src/app/home/page.tsx
urai-tier1/src/app/spatial/page.tsx
urai-tier1/src/spatial/layout/TierOneExperience.tsx
urai-tier1/src/components/urai/UraiV1Experience.tsx
urai-tier1/tests/guardian/route-canon.test.mjs
```

Files to modify:

```text
urai-tier1/src/app/spatial/page.tsx
```

Files to create:

```text
urai-tier1/src/app/spatial-fallback/page.tsx
```

Do not change:

```text
HomeScene internals
LifeMap behavior
Firebase config
env variable names
package versions
```

Implementation steps:

```text
1. Change /spatial to import TierOneExperience from @/spatial/layout/TierOneExperience.
2. Return <TierOneExperience mode="home" /> from /spatial.
3. Create /spatial-fallback route that imports UraiV1Experience.
4. Return <UraiV1Experience mode="home" /> from /spatial-fallback.
5. Run the guardian route test.
```

Acceptance criteria:

```text
/ uses TierOneExperience.
/home uses TierOneExperience.
/spatial uses TierOneExperience.
/spatial-fallback uses UraiV1Experience.
No primary route imports UraiV1Experience.
2.5D shell is fallback only.
```

Tests to run:

```bash
node urai-tier1/tests/guardian/route-canon.test.mjs
```

Fallback behavior:

```text
If WebGL fails or low-power mode is needed, users can be routed to /spatial-fallback.
```

Definition of done:

```text
The guardian route test passes and the route contract matches URAI_SPATIAL_MASTER_BLUEPRINT.md.
```

## T002: Memory Place schemas

Goal:
Add first-class MemoryPlace and PlaceObject schemas so memory stars can open into navigable places.

Files to inspect:

```text
urai-tier1/src/spatial/memory
urai-tier1/src/spatial/constellation
urai-tier1/src/spatial/replay
URAI_SPATIAL_MASTER_BLUEPRINT.md
```

Files to create:

```text
urai-tier1/src/spatial/places/memoryPlaceSchema.ts
urai-tier1/src/spatial/places/placeObjectSchema.ts
urai-tier1/src/spatial/places/locationClusterSchema.ts
urai-tier1/src/spatial/places/placePrivacyRules.ts
```

Acceptance criteria:

```text
MemoryPlace supports real, symbolic, and hybrid places.
MemoryPlace includes locationPrivacy.
PlaceObject includes memoryPlaceId and privacyLevel.
Default location precision is not exact.
```

## T003: MemoryPlace route and scene

Goal:
Create `/place/[placeId]` and a starter MemoryPlaceScene.

Files to create:

```text
urai-tier1/src/app/place/[placeId]/page.tsx
urai-tier1/src/spatial/places/MemoryPlaceScene.tsx
urai-tier1/src/spatial/places/demoMemoryPlaces.ts
urai-tier1/src/spatial/places/demoPlaceObjects.ts
```

Acceptance criteria:

```text
/place/[placeId] renders a 3D place scene.
Missing place uses fallback.
Scene has an exit action.
Exact location is not displayed by default.
```

## T004: Focus Chamber Enter Place action

Goal:
Update the memory star focus flow so a selected star can open its MemoryPlace.

Acceptance criteria:

```text
Selected star with canEnterPlace=true shows Enter Place.
Enter Place navigates to /place/[memoryPlaceId].
Selected star without memoryPlaceId does not show broken navigation.
```

## T005: Guardian script

Goal:
Add `pnpm urai:guardian` script to run Guardian tests.

Acceptance criteria:

```text
pnpm urai:guardian runs route canon first.
Future guardian tests can be added without changing the command.
```
