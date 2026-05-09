# Tier-2 Mock/Placeholder Path Exclusion Proof (2026-05-05)

## Goal
Demonstrate that mock/demo/placeholder flows are either:
1) intentional demo/empty-state behavior, or
2) isolated from production-critical lock paths.

## Scan method
Keyword scan over Tier app + spatial modules for:
- `mockRunner`
- `demo`
- `placeholder`
- `TODO`

## Findings summary

### Acceptable/demo-scoped
- `src/app/demo/*` routes intentionally demo-scoped.
- `useHomeWorldState` and `lifeMapModel` include controlled `demo-fallback` and `local` fallback pathways for empty/error resilience.

### Needs tracking but non-blocking to current lock
- `src/spatial/unity/UnityAdapterOverlay.tsx` includes placeholder bundle payload text (non-core Tier-2 path, not in primary locked user routes).
- `spatial/replay/PHASE7_TODO.md` is documentation backlog, not runtime-executed path.

## Exclusion statement
No production-blocking TypeScript/build/test failures are introduced by mock/demo/placeholder markers in current locked route surfaces.
Primary lock commands pass:
- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm test:canon`

## Lock conclusion
Tier-2 mock-path exclusion status: **PASS (with tracked non-core placeholder debt outside critical Tier-2 route lock path)**.
