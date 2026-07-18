# URAI Accessibility and Performance Evidence Plan

Date: 2026-07-18
Repository: `LifeLoggerAI/urai-spatial`
Base authority: `80d00730bfab9c746a8bb8993b26b5ee2b0778c4`
Branch: `feat/accessibility-performance-final-20260718`

## Scope

This lane owns diagnostics, isolated tests, evidence manifests, performance budgets, browser/device verification instructions, and the four bounded accessibility repairs explicitly listed below. It does not own Ground, Replay persistence, route navigation, production release workflows, deployment, rollback, credentials, DNS, billing, or production state.

## Baseline findings

- Existing reduced-motion support reacts to `prefers-reduced-motion` changes.
- Existing adaptive quality uses reduced motion, save-data, device memory, CPU hints, connection type, viewport width, pointer type, and document visibility.
- Existing persistent Orb target is 64px desktop and 56px mobile.
- Existing serialized Orb menu and Focus controls contain 44px minimum interactive targets; these are handed off in issue #696 instead of patched here.
- Existing Home WebGL detection returns no dedicated accessible fallback from `HomeSpatialRuntimeLayer` when WebGL is unavailable.
- Existing Playwright configuration currently declares Chromium only. Safari/iOS, Firefox, Edge, Android, physical-device, NVDA, VoiceOver, and TalkBack outcomes must remain `NOT AVAILABLE` or `BLOCKED` until independently executed.

## Work packages

| Package | Lane action | Acceptance evidence | Owner on failure |
| --- | --- | --- | --- |
| Keyboard journey | Add exact route and Orb keyboard traversal checks without changing route ownership | Playwright trace, screenshots, focus sequence | Serialized world lane if route/focus owner fails |
| Screen-reader semantics | Assert accessible names, landmarks, states, hidden decorative surfaces, and live regions | Browser accessibility snapshot and source contracts | Component owner |
| 48px targets | Measure effective target rectangles and emit machine-readable failures | JSON report and screenshots | Issue #696 for serialized components |
| Contrast/underexposure | Capture representative route states and document WCAG/manual inspection requirements | Screenshot set and inspection ledger | Visual serialized lane where applicable |
| Reduced motion | Verify media preference before load and runtime changes | Playwright assertions and screenshots | Owning component |
| No-WebGL | Verify bounded, navigable fallback behavior | Browser evidence | Home/runtime owner if absent |
| Context loss | Dispatch loss/restore events and verify stable state, no duplicate loops, bounded recovery | trace/log report | Persistent-world owner if required |
| Slow network | Exercise throttled, offline, failed-resource, and recovery states | network logs and screenshots | Resource/component owner |
| Mobile safe areas | Verify controls and captions remain inside visual viewport and safe-area bounds | geometry report | Visual/component owner |
| Performance | Retain bundle, memory, frame-time, long-task, and route-cycle measurements | machine-readable manifest | Performance lane |
| Browser/device matrix | Record exact environment and evidence status without converting emulation into physical proof | `docs/evidence/accessibility-performance-browser-device-matrix.json` | Independent reviewer/device owner |

## Budgets

- Desktop reference: target 60 FPS; p95 frame time <= 16.7ms.
- Lower-powered mobile reference: no sustained operation below 30 FPS; p95 frame time <= 33.3ms.
- No unbounded heap growth across five complete journey cycles.
- No duplicate renderer, listener, timer, or animation-loop accumulation after context loss/recovery.
- Primary interactive targets: >= 48x48 CSS pixels in all supported states.
- Existing stricter repository budgets remain authoritative and may not be weakened.

## Verification commands

```bash
corepack pnpm --dir urai-tier1 typecheck
corepack pnpm --dir urai-tier1 test:unit
corepack pnpm --dir urai-tier1 build
corepack pnpm exec playwright test urai-tier1/tests/accessibility-performance-evidence.spec.ts --config playwright.config.ts
```

The browser command requires the repository runtime dependencies and Playwright browser installation. Physical device and assistive-technology checks are separate human verification.

## Serialized handoff procedure

Every failure in `GroundGateway`, `FocusChamberClient`, `PersistentWorldCompanion`, route ownership, or release workflows must include exact SHA, environment, reproduction, expected/actual behavior, evidence location, minimal likely correction, and an explicit statement that this lane did not patch the owner. Quarantined tests must reference the issue and an unquarantine condition.

## Rollback

The branch is non-deploying. Rollback is deletion or revert of isolated documentation/test commits. No production configuration or route ownership is changed.

## Completion definition

This lane may be called source-complete only after exact-head typecheck, unit suite, build, isolated browser suite, retained artifacts, Drive ledger update, serialized handoffs, and honest browser/device matrix status. Independent physical-device and assistive-technology review remains required before an exact-head completion claim.