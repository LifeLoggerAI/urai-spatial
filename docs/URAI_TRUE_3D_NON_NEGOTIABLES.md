# URAI True 3D Non-Negotiables

URAI Spatial must remain a true 3D product. This file exists to prevent drift back into flat screens or 2.5D-first design.

## Primary rule

```text
The navigable 3D world is the product surface. Flat UI is overlay, settings, admin, export, or fallback.
```

## Required true 3D traits

URAI Genesis and later spatial versions must preserve:

```text
real camera movement
real scene depth
real lighting
3D ground/terrain
3D sky/atmosphere
3D orb or companion presence
3D memory stars
3D portals
3D particles/fields
3D memory places
navigable scene states
fallback path for low-power/no-WebGL devices
```

## Route lock

The primary routes must render the canonical 3D experience:

```text
/
/home
/spatial
```

Only the explicit fallback route may render the 2.5D shell:

```text
/spatial-fallback
```

## Forbidden drift

Do not:

```text
make /spatial render UraiV1Experience
replace HomeScene with flat panels
turn memory stars into final cards only
remove camera motion from primary flows
hide the 3D world behind dashboards
make portals into ordinary buttons only
ship Genesis as a flat wellness dashboard
```

## Allowed flat surfaces

Flat UI is allowed only for:

```text
settings
Passport permission controls
privacy explanations
admin tools
export previews
fallback mode
text summaries
accessibility alternatives
```

Flat UI should appear as an overlay on top of the world whenever possible.

## Memory rule

```text
Stars are doors. Places are memory scenes. Worlds are chapters. Realms are meaning layers.
```

## Acceptance criteria

A URAI spatial route is acceptable only if:

```text
it preserves 3D world continuity
it has a clear exit path
it has fallback behavior
it protects privacy by default
it does not depend on raw private data to render
it does not show debug/demo labels in Genesis mode
```
