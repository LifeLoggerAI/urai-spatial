# Canonical App Path

- **Chosen canonical product root**: `urai-tier1`
- **Current Home entry chain**: `urai-tier1/src/app/page.tsx` -> `urai-tier1/src/app/FinalHomeThreshold.tsx` -> `urai-tier1/src/app/HomeSpatialWorldFinal.tsx`
- **Canonical public branch**: `main`
- **Canonical public domain**: `https://urai.app`

## Runtime boundary

The public Next.js product under `urai-tier1` owns browser routes, UI, accessibility, privacy-safe fallback behavior, and deployment.

The root TypeScript runtime under `src` owns deterministic simulation, memory/replay ordering, prediction, XR-frame generation, communications packets, and analytics events. It is a separate computation plane and is not the deployed browser entrypoint.

The two planes may integrate only through a documented, versioned, JSON-safe contract with CI evidence. The root runtime must not be treated as production-integrated merely because its files compile or exist on `main`.

## Current primary route chain

`/` or `/home` -> `/ground` -> `/life-map` -> `/focus` -> `/replay` -> `/mirror` -> `/passport` -> `/status`

Each route's current source owner must be verified from its `urai-tier1/src/app/**/page.tsx` entry. Older references to `SpatialScene`, `TierOneExperience`, or `HomeScene` are historical unless a passing migration PR changes the route entry and this document in the same commit.

## Commands

- Install: `pnpm install --frozen-lockfile`
- Product typecheck: `pnpm typecheck`
- Product build: `pnpm build`
- Root runtime compile: `node scripts/check-system-loop-runtime.mjs`
- Root runtime smoke: `node scripts/smoke-system-loop-runtime.mjs`
