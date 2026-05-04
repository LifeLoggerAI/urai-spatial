# URAI Spatial Source-of-Truth Production Lock

Status: audit branch lock candidate
Date: 2026-05-04
Repo: LifeLoggerAI/urai-spatial
Live app source: `urai-tier1`

## Locked source of truth

`urai-tier1` is the canonical application package for URAI Spatial. The root workspace intentionally includes only:

- `urai-tier1`
- `apps/functions`
- `packages/tier-locks`

Audit, backup, archive, and quarantine folders are not production source of truth.

## Canonical runtime files

- App entry: `urai-tier1/src/app/page.tsx`
- Home route: `urai-tier1/src/app/home/page.tsx`
- LifeMap route: `urai-tier1/src/app/life-map/page.tsx`
- Focus route: `urai-tier1/src/app/focus/page.tsx`
- Spatial scene/state machine: `urai-tier1/src/spatial/scene/SpatialScene.tsx`
- Global shell/layout: `urai-tier1/src/app/layout.tsx`
- Global CSS: `urai-tier1/src/app/globals.css`
- Runtime TS scope: `urai-tier1/tsconfig.runtime.json`
- Firebase deploy config: `firebase.json`
- Firestore rules: `firebase/firestore.rules`
- Firestore indexes: `firebase/firestore.indexes.json`
- Functions source: `apps/functions`
- Production-lock workflow: `.github/workflows/spatial-production-lock.yml`
- E2E lock runner: `tests/spatial-lock.mjs`

## Locked architecture

URAI Spatial is a single canonical cinematic runtime rendered by `SpatialScene`. Routes are thin entrypoints/deep links into the same runtime, not independent alternate implementations.

The runtime uses an explicit client-side scene state machine with these states:

1. `home`
2. `ascent`
3. `lifemap`
4. `focus`
5. `replay`

`ascent` is an intentional transient state between `home` and `lifemap`. It is not a standalone route.

## Core routes

- `/` renders the canonical scene.
- `/home` deep-links to `home`.
- `/life-map` deep-links to `lifemap`.
- `/focus?node=<id>` deep-links to a focused node.
- `/replay?node=<id>` deep-links to replay for a node.

All stable routes keep the scene in one runtime so browser navigation and ESC unwind do not create competing scene ownership.

## Core state model

`SpatialScene.tsx` owns the live state:

- `phase`: current spatial state.
- `activeNodeId`: selected LifeMap node.
- `history`: ESC unwind stack.
- `replayPaused`: replay pause/resume state.
- `replayProgress`: replay progress meter.
- `isTransitioning`: guard against duplicate ascent/focus/replay transitions.
- `timers`: queued transition timers, cleaned on unmount.

## Home ascent flow

Home starts with the symbolic sky, orb, body shadow, and grounded hills. Activating the orb or LifeMap control pushes a `home` snapshot, enters `ascent`, shows the ascent cover, then settles into `lifemap`. Duplicate ascent activation is blocked by `isTransitioning`.

## LifeMap flow

LifeMap shows a deterministic starfield, constellation lines, and interactive nodes. Node activation pushes a `lifemap` snapshot, sets `activeNodeId`, and enters `focus`.

## Focus mode flow

Focus opens a premium card for the selected node, preserving the LifeMap behind it. Replay activation pushes a `focus` snapshot, resets replay progress, and enters `replay`.

## Replay chain flow

Replay shows a cinematic overlay, node-specific replay copy, progress meter, pause/resume control, and collapse/unwind control. Replay intervals are cleaned when the phase exits.

## ESC unwind rules

ESC always unwinds one state at a time from the history stack:

- `replay` -> `focus`
- `focus` -> `lifemap`
- `lifemap` -> `home`

If no history exists, ESC from any non-home stable state returns home. ESC is ignored during active transitions.

## Browser navigation rules

Route changes update the scene only when not in the transient `ascent` state. This avoids browser back/forward fighting the ascent timer. Deep links are normalized to a valid node and valid phase.

## Automation lock

The production lock is automated through `.github/workflows/spatial-production-lock.yml`. The workflow validates:

- canonical source-of-truth paths,
- frozen pnpm install,
- app typecheck,
- app build,
- functions build,
- functions tests,
- app tests,
- Chromium installation through `urai-tier1`'s existing Playwright dependency,
- standalone E2E flow runner at `tests/spatial-lock.mjs`,
- Firebase deploy target references.

The E2E runner intentionally avoids adding a new root `@playwright/test` dependency. It uses the existing `playwright` dependency already declared by `urai-tier1`, which keeps `pnpm-lock.yaml` stable.

## Tier completion status

### Tier 1: Locked

Verified and represented by the canonical app shell, `/home`, `/life-map`, `/focus`, and replay-capable route structure.

### Tier 2: Locked

Home -> ascent -> LifeMap, focus entry/exit, replay entry, and ESC unwind behavior are now explicitly represented in code and E2E automation.

### Tier 3: Locked candidate

Scene continuity, deep-link safety, node interaction, mobile viewport coverage, and fallback node normalization are implemented. Final browser/device visual review should run in Firebase Studio or a deployed preview.

### Tier 4: Locked candidate

Timer cleanup, interval cleanup, transition guards, accessible labels, responsive controls, reduced-motion handling, Firebase deploy-path validation, and CI automation are implemented. Final CI run is required before merging.

### Tier 5: Locked candidate

The experience is visually premium and aligned with URAI's symbolic/spatial identity: home sky, ascent veil, LifeMap starfield, glowing nodes, focus card, replay stream, and cinematic unwind. Final approval should be based on a live visual pass.

## Known completed items

- Canonical app source identified as `urai-tier1`.
- Firebase Hosting source aligned with `urai-tier1`.
- Missing live Firestore indexes file restored.
- Scene state ownership consolidated inside `SpatialScene`.
- ESC unwind stack added.
- Replay pause/resume and progress state added.
- Home ascent transition added.
- Deep-link node normalization added.
- Standalone E2E production lock runner added.
- GitHub Actions production-lock workflow added.
- Firebase deploy-reference validation automated.

## Remaining risks before final production merge

- Run the `URAI Spatial Production Lock` workflow and verify all steps pass.
- Perform live visual review on desktop and mobile viewport.
- Confirm Firebase project runtime supports framework-aware Hosting from `source: "urai-tier1"`.
- Decide whether archived/audit folders should stay in git or be moved out to reduce source ambiguity.

## Final production checklist

- [ ] Frozen install passes.
- [ ] Typecheck passes.
- [ ] Next build passes.
- [ ] Functions build and tests pass.
- [ ] E2E flow passes.
- [ ] Firebase deploy references validate.
- [ ] Firebase deploy preview opens `/home`, `/life-map`, `/focus`, and `/replay`.
- [ ] Visual review confirms no broken layout, z-index, clipping, overflow, or console noise.
- [ ] Merge PR only after CI/preview verification.
