# URAI Spatial Verified Completion Audit

Status: Blocked pending CI/build
Date: 2026-05-10
Canonical runtime path: `TierOneExperience -> HomeScene`

This audit turns the prior repo audit into an evidence-first completion pass. It does not grant production certification.

## Evidence Collected

### Files inspected

| File inspected | What it proves | Relevant finding | Runtime verification still needed |
| --- | --- | --- | --- |
| `package.json` | Root release and lock scripts exist. | Root scripts include `lock:static`, `lock:build`, `lock:e2e`, `lock:all`, `live:check`, `typecheck`, `build`, and `test`. | Yes |
| `urai-tier1/package.json` | Tier-1 app has direct Next/typecheck/test scripts. | Scripts include `typecheck`, `build`, `test`, `test:unit`, `lock:all`, and tier verification commands. | Yes |
| `urai-tier1/src/app/page.tsx` | Home route enters canonical shell. | Renders `<TierOneExperience mode="home" />`. | Yes |
| `urai-tier1/src/app/life-map/page.tsx` | Life Map route is gated and still exposes static contract symbols. | Renders `LifeMapAscentGate`; comment clarifies that the gate owns runtime readiness while preserving static `TierOneExperience mode="life-map"` visibility. | Yes |
| `urai-tier1/src/app/focus/page.tsx` | Focus route enters canonical shell. | Renders `<TierOneExperience mode="focus" />`. | Yes |
| `urai-tier1/src/app/replay/page.tsx` | Replay route enters canonical shell. | Renders `<TierOneExperience mode="replay" />`. | Yes |
| `urai-tier1/src/app/unwind/page.tsx` | Unwind route enters canonical shell. | Renders `<TierOneExperience mode="unwind" />`. | Yes |
| `urai-tier1/src/app/mirror/page.tsx` | Mirror route enters canonical shell. | Renders `<TierOneExperience mode="mirror" />`. | Yes |
| `urai-tier1/src/spatial/layout/TierOneExperience.tsx` | Canonical shell delegates to `HomeScene`. | Imports `HomeScene`, renders `<HomeScene sceneMode={mode} />`, and conditionally adds `MirrorRouteLayer`. | Yes |
| `urai-tier1/src/scene/HomeScene.tsx` | Main R3F runtime path exists. | Uses `Canvas`, camera rig, `ConstellationLayer`, `ManifestRenderBoundary`, `ReplayTimeline`, `ReplayMetaPanel`, and scene-mode routing state. | Yes |
| `urai-tier1/src/scene/MirrorExperience.tsx` | Mirror visual layer exists. | Provides CSS-heavy Mirror of Becoming UI and fallback signal grid. | Yes |
| `urai-tier1/src/scene/MirrorRouteLayer.tsx` | Mirror route overlay exists. | Wraps `MirrorExperience` and maps Escape to home. | Yes |
| `urai-tier1/src/spatial/assets/useManifest.ts` | Manifest loading bridge exists. | Uses demo fallback and Firestore `assetManifests` snapshots when available. | Yes |
| `urai-tier1/src/spatial/assets/ManifestRenderer.tsx` | Manifest rendering exists. | Renders image, video, model, or fallback panels; updated to allow safe `/demo/` public assets and reject `gs://`. | Yes |
| `urai-tier1/src/spatial/replay/ReplayTimeline.tsx` | Replay controls exist. | Provides play/pause, scrubber, segment labels, reduced-motion metadata, and keyboard interaction. | Yes |
| `urai-tier1/src/spatial/replay/ReplayMetaPanel.tsx` | Replay metadata/control panel exists. | Shows phase/source/signal/intensity/trust/privacy/actions; now supports optional `manifestId` for `/mirror?manifestId=<id>&source=replay`. | Yes |
| `urai-tier1/src/spatial/demo/demoMemoryStars.ts` | Demo manifest seed source exists. | Demo memory stars now seed local public SVG image artifacts instead of empty artifact arrays. | Yes |

### Commands run

| Command | Status | Important output |
| --- | --- | --- |
| `git clone --depth 1 https://github.com/LifeLoggerAI/urai-spatial.git /tmp/urai-spatial` | Blocked pending CI/build | `fatal: unable to access 'https://github.com/LifeLoggerAI/urai-spatial.git/': Could not resolve host: github.com` |
| `corepack enable` | Blocked pending CI/build | Not run because repo clone failed. |
| `pnpm install` | Blocked pending CI/build | Not run because repo clone failed. |
| `pnpm lock:all` | Blocked pending CI/build | Not run because repo clone failed. |
| `pnpm --filter urai-tier1 typecheck` | Blocked pending CI/build | Not run because repo clone failed. |
| `pnpm --filter urai-tier1 build` | Blocked pending CI/build | Not run because repo clone failed. |
| `pnpm --filter urai-tier1 test` | Blocked pending CI/build | Not run because repo clone failed. |
| `pnpm --filter urai-tier1 test:e2e` | Blocked pending CI/build | Not run because repo clone failed and this exact script is not listed in `urai-tier1/package.json`; root E2E scripts exist. |

### Runtime screenshots

Not captured. The execution environment could not clone or run the app.

### CI status

Not verified in this pass. GitHub status and workflow evidence must be checked after CI runs on the PR branch.

### Deployment status

Not verified in this pass. No deployed URL smoke was captured.

### Production certification

Not granted unless install, typecheck, build, tests, E2E, deployment smoke, and Tier 5 signoff all pass.

## Phase 1 safe fixes applied

### A. Life Map route clarity

Status: Implemented, not runtime-verified

`urai-tier1/src/app/life-map/page.tsx` now documents why the route keeps static canonical symbols while `LifeMapAscentGate` owns runtime transition/data readiness.

### B. Demo image artifacts

Status: Implemented, not runtime-verified

`urai-tier1/src/spatial/demo/demoMemoryStars.ts` now seeds local demo image artifacts for all demo memory tones. The renderer accepts `/demo/` public paths and six privacy-safe SVG placeholders were added under `urai-tier1/public/demo/memories/`.

### C. Mirror data wiring foundation

Status: Implemented, not runtime-verified

Added `urai-tier1/src/spatial/mirror/useMirrorInsight.ts`, a typed hook that accepts `manifestId` and `source`, loads manifest/demo fallback data, derives memory morphology, and returns privacy-safe Mirror signals. Existing Mirror visuals remain fallback-stable until build/runtime verification allows wiring them into the CSS-heavy component.

### D. Replay to Mirror route bridge

Status: Partial

`ReplayMetaPanel` now accepts optional `manifestId` and displays an `Open Mirror` action only when that prop is supplied. It routes to `/mirror?manifestId=<id>&source=replay`. The larger `HomeScene` data flow was not modified in this pass because build/typecheck could not be run.

## Phase 2 plans only

Status: Needs product-data wiring

Do not build these until Phase 1 passes install, typecheck, build, tests, E2E, and lock gates:

- `MemoryGalleryPanel` and `/gallery`: define source data from approved manifests first.
- `LifeMoviePlayer` and `/life-movie`: wait until replay path threading and export requirements are stable.
- `/api/video/export` and `VideoExportJob` schema: require server queue, storage policy, privacy review, and billing constraints.
- `SpatialWeatherLayer` / `AtmosphericStateEngine`: define compact state contract and mobile performance budget first.
- Mobile performance pass: measure current R3F cost before optimizing.
- Security/privacy audit pass: run after live provider boundaries, manifest ingestion, and Mirror data wiring are final.

## Remaining blockers

- Blocked pending CI/build: repo could not be cloned in this execution environment.
- Blocked pending CI/build: install/typecheck/build/test/E2E were not run.
- Blocked pending CI/build: runtime screenshots were not captured.
- Blocked pending CI/build: deployment smoke was not captured.
- Needs product-data wiring: Mirror hook is present but not yet fully wired into the visual component.
- Needs product-data wiring: Replay-to-Mirror button requires a caller to pass `manifestId` through the existing replay data flow.

## Launch readiness score

Partial: 68/100

Reasoning: source evidence confirms a strong canonical runtime foundation and safe Phase 1 source fixes have been added, but no production certification can be granted without passing install, typecheck, build, tests, E2E, deployment smoke, and Tier 5 signoff.
