# Tier-2 Route State Matrix (2026-05-05)

## Purpose
Hard PASS artifact for route-by-route loading/empty/error/permission review.

Legend: PASS / PARTIAL / BLOCKED

| Route | Loading state | Empty state | Error state | Permission-denied state | Notes |
|---|---|---|---|---|---|
| `/home` (`src/app/home/page.tsx`, `spatial/home/*`) | PASS | PASS (sparse/demo fallback) | PASS (fallback + source badge) | PARTIAL | Permission-denied handled as fallback path; explicit denial UX copy can be strengthened. |
| `/life-map` (`src/app/life-map/page.tsx`, `spatial/scene/lifeMapModel.ts`) | PASS | PASS (demo-fallback nodes/edges/chapters) | PASS (fallback + warning path) | PARTIAL | Firestore read failures degrade to demo-fallback; explicit denial banner not distinct from generic error fallback. |
| `/focus` (`src/app/focus/page.tsx`) | PASS | PASS | PASS | PASS | Focus route remains functional under no-data scenario via scene defaults. |
| `/mirror` (`src/app/mirror/page.tsx`) | PASS | PASS | PASS | PASS | Mirror route currently uses stable shell fallback behavior. |
| `/replay` (`src/app/replay/page.tsx`, `spatial/replay/*`) | PASS | PASS | PASS | PARTIAL | Browser-binary gate can skip replay lock test in env; runtime route handles missing data. |

## Evidence points
- Home fallback and source states: `useHomeWorldState` provides `firestore`, `demo-fallback`, and `local` sources.
- LifeMap fallback paths in `lifeMapModel.ts` for nodes/edges/chapters on Firestore failures.
- Root test suite currently green (`pnpm test`) with guarded browser-dependent runners.

## Lock decision for this matrix
- Tier-2 route-state matrix status: **PASS WITH PARTIAL PERMISSION-DENIED UX DISTINCTNESS**.
- Non-blocking for build/type/test lock, but should be tracked for UX hardening if explicit denial messaging is mandated by launch policy.
