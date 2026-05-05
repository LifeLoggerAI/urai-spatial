# URAI Companion Launch Audit

Date: 2026-05-05
Repo: LifeLoggerAI/urai-spatial
Scope: urai-tier1 spatial Life Map + companion systems

## Executive status

Status: PARTIALLY VERIFIED / NOT LAUNCH-READY YET.

The repository now contains the companion engine stack and a valid minimal SpatialScene entrypoint. The app is not fully wired visually yet because the current SpatialScene only renders the existing scene, starfield, camera rig, and narrator bridge. The new companion pipeline exists as standalone code and must be integrated into UI components before the companion is visible.

## Verified repo facts

- package.json includes runnable scripts for `typecheck`, `build`, `audit:visual-lock`, `audit:final`, and tests.
- Current `src/spatial/scene/SpatialScene.tsx` is valid React/Next client code, not the earlier bash-script corruption.
- Current `SpatialScene.tsx` renders `NarratorVoiceBridge`, `CinematicCameraRig`, `HomeWorld`, and `LifeMapStarfield`.
- Companion pipeline exists at `src/spatial/companion/CompanionPipeline.ts` and chains decision, emotion, continuity, signature, ritual, voice payload, cadence, and timing.
- Companion type definitions depend on `src/spatial/scene/lifeMapModel.ts`, which defines LifeMap phase/mode/node shapes.
- GitHub Actions workflow lookup for commit `787071412567a103614ab47ba66a589641f2f8f5` returned no workflow runs via connector, so CI/build status is not verified from GitHub.

## Code audit findings

### 1. SpatialScene is clean but not wired to companion UI

Current SpatialScene is minimal. It does not import `runCompanionPipeline`, does not render a `CompanionOrb`, and does not render a `FirstLightExperience`. This means the new companion systems are present in the repo but dormant.

Required next patch:

```tsx
import { runCompanionPipeline } from "../companion/CompanionPipeline";
import { shouldShowCompanionLine, trimForLaunch } from "../companion/CompanionLaunchPolish";
```

Then run the pipeline only on stable events: phase changes, selected node/star changes, and user taps. Do not run it per frame.

### 2. Visual audit cannot be completed from connector-only access

The GitHub connector can inspect files, commits, PRs, and workflow metadata. It cannot boot the app, open a browser, render Three.js, or capture screenshots. A real visual audit still requires running locally or in CI with browser automation.

Recommended command:

```bash
cd ~/urai-spatial/urai-tier1
pnpm install
pnpm typecheck
pnpm build
pnpm audit:final
pnpm dev
```

Then visually inspect `/life-map`.

### 3. Type risk: companion scene input vs current scene store

`CompanionSceneInput` expects LifeMap-style objects: `phase`, `mode`, `selectedNode`, `visibleNodes`, and `showReplay`. Current SpatialScene uses `useSceneStore` with `phase`, selected star ID/position, and `LifeMapStarfield` stars. Integration must map star selections into LifeMapNode-compatible memory signals or adjust companion input to support LifeMapStar.

Do not force incompatible types into the pipeline. Add an adapter:

```ts
function starToCompanionMemorySignal(star) { ... }
```

or extend companion input with star-specific context.

### 4. Launch restraint system exists

`CompanionLaunchPolish.ts` provides min gaps, character limits, orb transition timings, and launch readiness checks. This should be applied after the pipeline output before rendering text.

### 5. Voice must remain disabled by default

The voice engine supports silent/tap/soft-auto modes. For launch, default must be silent and voice should activate only through a user gesture.

## Visual audit checklist

Use this after local run:

- Open `/life-map`.
- Confirm no console errors.
- Confirm no `Maximum update depth exceeded` errors.
- Confirm starfield depth feels forward-facing, not top-down.
- Tap a star and confirm camera focus is smooth.
- Confirm companion is silent by default.
- Confirm companion line does not appear more than once within launch-polish gap.
- Confirm voice only plays after explicit tap.
- Confirm no sacred/signature moment in first session.
- Confirm First Light has no more than six companion lines.
- Confirm `Why am I seeing this?` explanation is available where companion line appears.

## Required missing components before launch

These are not yet verified present:

- `src/spatial/companion/CompanionOrb.tsx`
- `src/spatial/companion/CompanionCard.tsx`
- `src/spatial/onboarding/FirstLightExperience.tsx`
- UI adapter from `LifeMapStar` / scene store to `CompanionPipelineInput`
- localStorage or Firestore flag for `hasSeenFirstLight`
- timer cleanup around delayed speech/cadence calls

## Recommended implementation order

1. Create `CompanionOrb.tsx` and `CompanionCard.tsx` as pure presentational components.
2. Create `FirstLightExperience.tsx` using `firstLightScript.ts` and `MAX_COMPANION_LINES_FIRST_SESSION`.
3. Add a companion adapter that maps current starfield state into pipeline inputs.
4. Integrate pipeline into SpatialScene with `useEffect`, guarded by stable dependencies only.
5. Add timer cleanup in effects.
6. Run `pnpm typecheck`, `pnpm build`, and `pnpm audit:final` locally.
7. Perform visual audit in browser.

## Launch decision

Do not launch the companion layer until the missing components are added and the app passes local typecheck/build plus browser visual audit. The architecture is in place. The rendered product is not complete until UI integration is done.
