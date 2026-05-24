# Route Architecture (Canonical Ownership)

## Canonical Runtime Root

- The canonical production runtime root is `urai-tier1`.
- `/` is the single canonical spatial entry route and is owned by `urai-tier1/src/app/page.tsx`.
- Root-level `src/app` is not a production runtime surface. Keep this note aligned with `CANONICAL_RUNTIME.md` and do not add `page.tsx`, `layout.tsx`, or `route.ts` files here.

## Alias Routes (Intentional Redirects)

The following routes are maintained only as compatibility aliases and must redirect to `/`:

- `/home`
- `/life-map`
- `/replay`
- `/ascent`
- `/unwind`

These aliases live under `urai-tier1/src/app` and should not mount independent scene systems outside the canonical `TierOneExperience` shell. This prevents route drift where multiple pages evolve different rendering trees.

## Ownership Rule

If a new route needs distinct scene behavior, it must be documented here and explicitly justified as a new canonical owner rather than an alias. Any future migration that makes root-level `src/app` executable must update `CANONICAL_RUNTIME.md`, `SYSTEM_MAP.md`, `pnpm-workspace.yaml`, `firebase.json`, CI, and runtime boundary checks in the same change.
