# URAI Spatial Source-of-Truth Production Lock

Status: audit branch lock candidate
Date: 2026-05-07
Repo: LifeLoggerAI/urai-spatial
Live app source: `urai-tier1`

## Locked source of truth

`urai-tier1` is the canonical application package for URAI Spatial. The root workspace intentionally includes only:

- `urai-tier1`
- `apps/functions`
- `packages/tier-locks`

Audit, backup, archive, and quarantine folders are not production source of truth.

## Canonical runtime path

The V1 launch runtime authority is:

```txt
Next.js route
  -> urai-tier1/src/spatial/layout/TierOneExperience.tsx
  -> urai-tier1/src/scene/HomeScene.tsx
```

`TierOneExperience` is the route shell. `HomeScene` owns the routed launch scene state, including Home, Ascent, Life Map, Focus, Replay, and Mirror modes.

## Canonical runtime files

- App entry: `urai-tier1/src/app/page.tsx`
- Home route: `urai-tier1/src/app/home/page.tsx`
- Ascent route: `urai-tier1/src/app/ascent/page.tsx`
- Life Map route: `urai-tier1/src/app/life-map/page.tsx`
- Focus route: `urai-tier1/src/app/focus/page.tsx`
- Replay route: `urai-tier1/src/app/replay/page.tsx`
- Mirror route: `urai-tier1/src/app/mirror/page.tsx`
- Route shell: `urai-tier1/src/spatial/layout/TierOneExperience.tsx`
- Canonical scene: `urai-tier1/src/scene/HomeScene.tsx`
- Global shell/layout: `urai-tier1/src/app/layout.tsx`
- Global CSS: `urai-tier1/src/app/globals.css`
- App fallback styles: `urai-tier1/src/app/boundary.css`
- Firebase deploy config: `firebase.json`
- Firestore rules: `firebase/firestore.rules`
- Firestore indexes: `firebase/firestore.indexes.json`
- Functions source: `apps/functions`
- Production-lock workflow: `.github/workflows/spatial-production-lock.yml`
- E2E lock runner: `tests/spatial-lock.mjs`
- Replay Tier 5 runner: `tests/replay-tier5-lock.mjs`
- Runtime authority check: `scripts/check-runtime-authority.mjs`

## legacy / migration-candidate path

The following path exists but is not V1 route authority:

```txt
urai-tier1/src/spatial/scene/SpatialScene.tsx
```

It may contain useful systems, but it must not compete with `TierOneExperience -> HomeScene`. New launch behavior should go into the canonical path unless a migration PR explicitly moves a system from the legacy path into canonical modules.

## Core routes

- `/` renders Home.
- `/home` renders Home.
- `/ascent` renders the cinematic Ascent transition.
- `/life-map` renders the Life Map constellation.
- `/focus` renders focused memory state.
- `/replay` renders Replay state.
- `/mirror` renders the Mirror/detail state.

## Core state model

`HomeScene.tsx` owns V1 routed scene state and interactions:

- `sceneMode`: current spatial mode.
- `selectedManifest`: selected memory manifest.
- `selectedPosition`: selected constellation position.
- `narratorContext`: narrator mode.
- `cameraResetSignal`: camera reset trigger.
- `activeManifest`: manifest used by focus/replay renderers.

## Home ascent flow

Home sky activation routes to `/ascent`. Ascent auto-advances to `/life-map` unless reduced motion is enabled, in which case the user can explicitly enter the Life Map.

## Life Map flow

Life Map renders deterministic demo stars plus optional Firestore-backed manifests. Selecting a star routes to Focus with a `manifestId`.

## Focus and replay flow

Focus renders a selected memory panel and can start Replay. Escape unwinds one layer at a time:

- `replay` -> `focus`
- `focus` -> `life-map`
- `life-map` or `ascent` -> `/`

## Automation lock

The production lock is automated through `.github/workflows/spatial-production-lock.yml`. The workflow validates:

- source-of-truth files,
- install,
- preflight,
- runtime authority,
- app typecheck,
- app build,
- functions build/tests,
- app tests,
- E2E lock flow,
- Replay Tier 5 flow,
- canonical governance checks,
- Firebase deploy references.

## Tier completion status

### Tier 1: Locked candidate

Repo structure, canonical source files, Firebase config, package manager pin, and app boundaries are present.

### Tier 2: Locked candidate

Home -> Ascent -> Life Map -> Focus -> Replay route contract is documented and covered by runtime governance.

### Tier 3: Locked candidate

Typecheck, tests, build, and E2E commands are wired in CI. Final result depends on GitHub Actions execution.

### Tier 4: Locked candidate

Preflight, runtime authority, Firebase deploy checks, and CI validation are wired. Final result depends on CI and deployed preview.

### Tier 5: Partial

Production handoff docs exist, but production lock remains blocked until automated checks pass and all manual signoffs in `verification/signoffs.md` are complete.

## Final production checklist

- [ ] Install passes.
- [ ] Preflight passes.
- [ ] Runtime authority check passes.
- [ ] Typecheck passes.
- [ ] App tests pass.
- [ ] App build passes.
- [ ] Functions build/tests pass.
- [ ] E2E flow passes.
- [ ] Replay Tier 5 flow passes.
- [ ] Firebase deploy references validate.
- [ ] Preview deploy opens `/`, `/home`, `/ascent`, `/life-map`, `/focus`, `/replay`, and `/mirror`.
- [ ] Visual review confirms no broken layout, z-index, clipping, overflow, or console noise.
- [ ] `verification/signoffs.md` has no `Status: PENDING` entries.
