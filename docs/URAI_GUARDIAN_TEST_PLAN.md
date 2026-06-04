# URAI Guardian Test Plan

The Guardian suite turns the URAI Spatial canon into executable checks. If a rule matters to the product, it should eventually have a Guardian test.

## Required command

Target command:

```bash
pnpm urai:guardian
```

Until the package script is wired, run individual tests directly:

```bash
node urai-tier1/tests/guardian/route-canon.test.mjs
```

## Guardian principles

1. Do not flatten URAI.
2. Do not make 2.5D the default.
3. Keep true 3D as the primary product surface.
4. Keep 2.5D at `/spatial-fallback` only.
5. Make stars doorways into places.
6. Require places to have privacy levels.
7. Require sensitive places and realms to have gates.
8. Require every scene and realm to have an exit path.
9. Require exports to pass redaction.
10. Block debug/demo language in Genesis mode.

## Guardian test files

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

## Route canon

Must pass:

```text
/                         TierOneExperience
/home                     TierOneExperience
/spatial                  TierOneExperience
/spatial-fallback         UraiV1Experience
```

Must fail:

```text
/ imports UraiV1Experience
/home imports UraiV1Experience
/spatial imports UraiV1Experience
```

## Memory place canon

Required checks:

```text
MemoryStar supports memoryPlaceId.
MemoryStar supports canEnterPlace.
MemoryPlace includes kind, category, reconstruction, emotionalOverlay, navigation, privacyLevel, and locationPrivacy.
PlaceObject includes memoryPlaceId, objectType, label, position, interactionType, and privacyLevel.
Sensitive MemoryPlace records require a gate.
Exact location is never default.
```

## Location privacy canon

Forbidden by default:

```text
Exact address rendered in Genesis mode.
Exact latitude/longitude rendered in Genesis mode.
Exact location exported without explicit opt-in.
Raw location source exposed in public/demo mode.
```

Allowed defaults:

```text
hidden
symbolic-only
city-only
approx-private
```

## Sensitive gate canon

Sensitive gates are required for heavy private contexts, health-related contexts, relationship conflict contexts, legal/financial sensitive contexts, and other high-sensitivity place memories.

Gate options should include:

```text
Enter softly
Preview from doorway
Ask orb to summarize
Skip for now
Hide this place
Disable this category
```

## No-debug-copy canon

Genesis mode must not show:

```text
demo seed
debug
test
placeholder
mock
fake data
lorem ipsum
Firestore fallback active
V1 preview
```

Dev/demo mode may show these only when explicitly flagged.

## Golden E2E flows

```text
Home -> LifeMap -> Focus -> Enter Place -> Exit Home
Home -> LifeMap -> Replay -> Return
Location Map -> Memory Place -> Inspect Object -> Exit
Sensitive Place -> Gate -> Preview -> Exit
WebGL failure -> 2.5D fallback
Firebase failure -> local fallback world
Export -> privacy redaction -> safe output
Shadow Realm -> gate -> exit safely
```

## Release gate

No release should proceed unless:

```text
route canon passes
schema canon passes
privacy canon passes
sensitive gate canon passes
fallback canon passes
no-debug-copy canon passes
golden E2E smoke passes
build passes
typecheck passes
```
