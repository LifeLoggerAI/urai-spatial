# Route Architecture (Canonical Ownership)

## Canonical Route

- `/` is the single canonical spatial entry route.
- `src/app/page.tsx` owns runtime scene mounting and renders `src/spatial/scene/SpatialScene.tsx` directly.

## Alias Routes (Intentional Redirects)

The following routes are maintained only as compatibility aliases and must redirect to `/`:

- `/home`
- `/life-map`
- `/replay`
- `/ascent`

These aliases should not mount independent scene components. This prevents route drift where multiple pages evolve different rendering trees.

## Ownership Rule

If a new route needs distinct scene behavior, it must be documented here and explicitly justified as a new canonical owner rather than an alias.
