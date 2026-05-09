# Spatial Lock QA Checklist

Use this checklist before release to verify all spatial-lock acceptance criteria in both automated and manual QA.

## Execution commands

Run these commands from repo root and attach logs/screenshots to the sign-off section.

- `pnpm --filter urai-tier1 test`
- `pnpm --filter urai-tier1 build`
- `pnpm preflight`
- `pnpm firebase:rules:check`
- Optional full-browser gate: `pnpm test:e2e`

## Repo snapshot check outputs

### Current automation snapshot (2026-05-09)

| Check | Status | Result summary | Classification |
| --- | --- | --- | --- |
| `pnpm --filter urai-tier1 test` | ✅ Pass | 63 tests passed, 0 failed. Route contracts, Home World cinematic signal tests, Life Map 3D behavior, phase machine, glow scoring, timeline payload builders, and canon schema tests passed. | Tier-1 app automation |
| `pnpm --filter urai-tier1 build` | ✅ Pass | Next.js production build completed. Static generation completed for 34 app routes, including `/`, `/home`, `/ascent`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/admin/invites`, `/spatial`, `/privacy`, and `/terms`. | Tier-1 app build |
| `pnpm preflight` | ✅ Pass with warnings | Preflight passed. Local runtime warned that deployment secrets were not present: `FIREBASE_SERVICE_ACCOUNT_URAI_SPATIAL`, `URAI_SPATIAL_FIREBASE_PROJECT_ID`, and `URAI_SPATIAL_FIREBASE_WEB_CONFIG`. | Repo/tooling gate |
| `pnpm firebase:rules:check` | ✅ Pass | Firestore Tier-1 boundaries passed. | Firebase/security gate |
| `pnpm test:e2e` | ⏳ Pending / environment-dependent | Requires Playwright browser/system dependencies in the execution environment. | Full browser gate |

### Historical snapshot (2026-05-04) — resolved by PR #188 automation pass

| Check | Historical status | Historical result summary | Current disposition |
| --- | --- | --- | --- |
| `pnpm typecheck` | ❌ Fail | TypeScript failures in HomeWorld explainability payload, orphaned `SpatialScene.broken.*`, and missing typed IDs. | Superseded by passing Tier-1 test/build gate on 2026-05-09. |
| `pnpm build` | ❌ Fail | Next build failed at `src/spatial/home/explainHomeWorldState.ts` on `confidenceBucket`. | Resolved in current build evidence. |
| `pnpm test` | ❌ Fail | `urai-tier1` tests failed due to unresolved HomeWorld default import and stale route contracts. | Resolved in current test evidence. |

## Failure separation: legacy vs Life Map-specific

- **Current Life Map-specific failures:**
  - None in current Tier-1 automated evidence.
- **Remaining gates not yet proven by automation:**
  - Full browser/E2E checks.
  - Live deployment secrets, domain, DNS, SSL, deployed Firestore rules/functions, and production smoke.
  - Manual rendering/performance QA on desktop and mobile.

## Route/interaction pass-fail matrix

| Area | Automated evidence | Status | Notes |
| --- | --- | --- | --- |
| `/life-map` route rendering contract | `tests/spatial-route-contract.test.mjs` and `tests/lifemap-scene-behavior.test.mjs` | ✅ Pass | Canonical route shell, Life Map star focus, and focus navigation contracts pass. |
| Focus interaction | `tests/phaseMachine.test.mjs` (`canEnterReplay requires focus + selected + focusReady`) | ✅ Pass | Focus gating behavior passes. |
| Chapter click interaction | `tests/lifemap-scene-behavior.test.mjs`, phase/camera/timeline payload tests | ✅ Pass | Chapter focus and event payload builder tests pass. Browser-level click QA remains recommended. |
| Resolve interaction (`Mark resolved`) | `tests/phaseMachine.test.mjs` and glow scoring tests | ✅ Pass | Resolve state transition and de-prioritization behavior pass. Browser-level manual QA remains recommended. |
| Reduced-motion handling | `tests/home-world-cinematic-signal.test.mjs`, `tests/phaseMachine.test.mjs` | ✅ Pass | Reduced-motion structural assertions and no-loop behavior pass. |
| Firestore boundary safety | `pnpm firebase:rules:check` | ✅ Pass | Firestore Tier-1 boundaries passed. |

## Acceptance criteria matrix

| ID | Acceptance criterion | Script command(s) | Manual browser verification |
| --- | --- | --- | --- |
| AC-01 | **No blank opening**: first public load renders intentional sky/baseline scene (not empty/black/unstyled shell). | `pnpm --filter urai-tier1 build`, `pnpm --filter urai-tier1 test` | Open public mode in a fresh incognito session. Confirm initial scene paints immediately with expected sky/baseline visual and no blank frame pause beyond normal loading. Capture screenshot/video evidence. |
| AC-02 | **No raw phase/debug labels in public mode**: public view does not show internal phase text, debug tags, or dev-only status markers. | `pnpm --filter urai-tier1 test` | In public mode, traverse opening + transition states and inspect UI overlays/text. Confirm no strings like raw phase names, debug labels, or internal flags are visible. Capture screenshot evidence for each checked state. |
| AC-03 | Home invariant holds: no unintended text/buttons/navigation in home scene. | `pnpm --filter urai-tier1 test` | Enter home scene as anonymous user and verify only intentional UI appears. Capture screenshot evidence. |
| AC-04 | Tier1 anonymous renders sky baseline. | `pnpm --filter urai-tier1 test`, `pnpm --filter urai-tier1 build` | Open anonymous Tier1 route and verify sky baseline visuals + expected controls behavior. Capture screenshot evidence. |
| AC-05 | Tier2 requires auth + consent + flags. | `pnpm --filter urai-tier1 test`, optional E2E | Attempt Tier2 access with (a) anonymous user, (b) authed without consent, (c) authed with consent but missing flags, and (d) fully eligible user. Verify deny/allow outcomes match policy. Capture per-case evidence. |
| AC-06 | Tier3 requires auth + entitlement + flags + safety. | `pnpm --filter urai-tier1 test`, optional E2E | Attempt Tier3 access with each missing requirement and then with all requirements present. Verify deny/allow behavior and safety guard path. Capture per-case evidence. |
| AC-07 | Denied requests emit `spatial_lock_denied` and fallback. | Optional E2E/live telemetry | Trigger denied Tier2/Tier3 scenarios in browser and confirm fallback UI appears and telemetry event is emitted. Capture logs/screenshots. |
| AC-08 | Firestore rules block client writes to entitlement/admin fields. | `pnpm firebase:rules:check` | From client context or emulator UI, attempt direct writes to protected entitlement/admin fields and verify permission denied. Capture emulator/log evidence. |
| AC-09 | Function writes tier lock audit events for denied Tier2/Tier3 checks. | Functions test/live check | Trigger denied checks and verify audit entries are written with expected metadata. Capture function logs/event records. |
| AC-10 | **Life-map persistence after ascent**: life-map/progression state survives ascent transition and remains correct after reload. | `pnpm --filter urai-tier1 test`, `pnpm --filter urai-tier1 build`, optional E2E | Perform ascent flow, verify life-map state updates, then reload and re-enter flow. Confirm persisted state is restored accurately. |
| AC-11 | **Replay completion toast**: replay completion shows the expected completion toast exactly once per completion event. | `pnpm --filter urai-tier1 test`, optional E2E | Complete replay end-to-end in browser and verify toast copy/timing/duplication behavior. |
| AC-12 | **Esc unwind sequence**: pressing `Esc` unwinds UI/state in the defined order until safe base state. | `pnpm --filter urai-tier1 test`, optional E2E | Enter deepest interactive state, press `Esc` repeatedly, and verify each unwind step occurs in correct sequence with no skips/stalls. |

## Final QA sign-off template

Fill one row per criterion with explicit evidence links (PR comment links, screenshots, logs, videos, telemetry query IDs).

| ID | Criterion summary | Script(s) run + result | Manual check result | Evidence links/notes | Sign-off |
| --- | --- | --- | --- | --- | --- |
| AC-01 | No blank opening | ✅ Automated pass | ☐ Manual pending | PR #188 local log evidence | Name / Date |
| AC-02 | No raw phase/debug labels in public mode | ✅ Automated pass | ☐ Manual pending | PR #188 local log evidence | Name / Date |
| AC-03 | Home invariant: intentional UI in home scene | ✅ Automated pass | ☐ Manual pending | PR #188 local log evidence | Name / Date |
| AC-04 | Tier1 anonymous sky baseline | ✅ Automated pass | ☐ Manual pending | PR #188 local log evidence | Name / Date |
| AC-05 | Tier2 auth + consent + flags gating | ✅ Structural automated pass | ☐ Manual/live pending | Needs live/auth scenario evidence | Name / Date |
| AC-06 | Tier3 auth + entitlement + flags + safety gating | ✅ Structural automated pass | ☐ Manual/live pending | Needs live/auth scenario evidence | Name / Date |
| AC-07 | `spatial_lock_denied` + fallback on deny | ☐ E2E/live pending | ☐ Manual/live pending | Needs telemetry/e2e evidence | Name / Date |
| AC-08 | Firestore protected field write denial | ✅ Rules pass | ☐ Manual/emulator optional | `pnpm firebase:rules:check` passed | Name / Date |
| AC-09 | Denied-check audit events written by function | ☐ Functions/live pending | ☐ Manual/live pending | Needs functions evidence | Name / Date |
| AC-10 | Life-map persistence after ascent | ✅ Structural automated pass | ☐ Manual/e2e pending | Needs browser reload evidence | Name / Date |
| AC-11 | Replay completion toast | ✅ Structural automated pass | ☐ Manual/e2e pending | Needs browser replay evidence | Name / Date |
| AC-12 | Esc unwind sequence | ✅ Automated pass | ☐ Manual/e2e pending | Needs browser sequence evidence | Name / Date |

### Release recommendation

- Overall decision: ☐ **Ship** ☑ **Block production deploy until live/manual signoffs are complete**
- Blocking issues for production deploy:
  - Playwright/full-browser E2E not yet recorded in this checklist.
  - Manual visual QA evidence not yet attached.
  - Deployment secrets/domain/DNS/SSL/live Firebase/function checks remain pending in `verification/signoffs.md`.
- QA lead sign-off:
- Date:
