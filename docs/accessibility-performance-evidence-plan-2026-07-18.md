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
- Existing serialized Orb menu and Focus controls contained 44px minimum interactive targets; this lane raises the owned targets to 48px.
- Existing Home WebGL detection did not expose a dedicated accessible fallback from `HomeSpatialRuntimeLayer` when WebGL was unavailable; this lane adds bounded recovery and fallback behavior.
- Automated Chromium evidence covers desktop and mobile viewports. Safari/iOS, Firefox, Edge, Android physical devices, NVDA, VoiceOver, and TalkBack outcomes remain `NOT AVAILABLE` or `BLOCKED` until independently executed.

## Work packages

| Package | Lane action | Acceptance evidence | Owner on failure |
| --- | --- | --- | --- |
| Keyboard journey | Add exact route and Orb keyboard traversal checks without changing route ownership | Playwright trace, screenshots, focus sequence | Serialized world lane if route/focus owner fails |
| Screen-reader semantics | Assert accessible names, landmarks, states, hidden decorative surfaces, and live regions | Browser accessibility snapshot and source contracts | Component owner |
| 48px targets | Measure effective target rectangles and emit machine-readable failures | JSON report and screenshots | Component owner |
| Contrast/underexposure | Capture representative route states and document WCAG/manual inspection requirements | Screenshot set and inspection ledger | Visual serialized lane where applicable |
| Reduced motion | Verify media preference before load and runtime changes | Playwright assertions and screenshots | Owning component |
| No-WebGL | Verify bounded, navigable fallback behavior | Browser evidence | Home/runtime owner if absent |
| Context loss | Dispatch loss/restore events and verify stable state, no duplicate loops, bounded recovery | Trace/log report | Persistent-world owner if required |
| Slow network | Exercise offline and recovery states | Network assertions | Resource/component owner |
| Mobile safe areas | Verify controls and captions remain inside visual viewport and safe-area bounds | Geometry report | Visual/component owner |
| Performance | Measure the production static export, record renderer identity, enforce frame/long-task budgets only on a proven hardware renderer, and always gate five-cycle heap growth | Machine-readable manifests | Performance lane |
| Browser/device matrix | Record exact environment and evidence status without converting emulation into physical proof | `docs/evidence/accessibility-performance-browser-device-matrix.json` | Independent reviewer/device owner |

## Budgets

- Hardware desktop reference: p95 steady-state frame time <= 20ms (a scheduler-tolerant 60 FPS gate; nominal frame interval is 16.7ms).
- Hardware mobile-viewport reference: p95 steady-state frame time <= 33.3ms.
- On a proven hardware renderer, each route must capture at least 90 frames, no more than one steady-state long task, and no task longer than 100ms.
- The workflow must record the unmasked renderer and vendor. SwiftShader, llvmpipe, Microsoft Basic Render, another software renderer, or unavailable renderer identity produces `NOT_AVAILABLE_HARDWARE_RENDERER`; it may retain diagnostics but must not claim the absolute frame/long-task budgets passed.
- Five complete route-journey cycles per desktop/mobile profile always gate JavaScript heap growth <= 32 MiB.
- Performance evidence must run against the exact production static export; a development server is prohibited.
- No duplicate renderer, listener, timer, or animation-loop accumulation after context loss/recovery.
- Primary interactive targets: >= 48x48 CSS pixels in all supported states.
- Existing stricter repository budgets remain authoritative and may not be weakened.

## Verification commands

```bash
corepack pnpm --dir urai-tier1 typecheck
corepack pnpm --dir urai-tier1 test:unit
corepack pnpm build:static
corepack pnpm exec playwright test --config playwright.accessibility.config.ts
```

The browser command requires the static export, repository runtime dependencies, and Playwright Chromium installation. The evidence records whether absolute performance budgets were enforced or unavailable because the runner exposed no hardware renderer. Mobile automation is viewport evidence, not a substitute for physical-device, hardware-performance, or assistive-technology checks.

## Serialized handoff procedure

Every failure in `GroundGateway`, `FocusChamberClient`, `PersistentWorldCompanion`, route ownership, or release workflows must include exact SHA, environment, reproduction, expected/actual behavior, evidence location, minimal likely correction, and an explicit statement that this lane did not patch the owner. Quarantined tests must reference the issue and an unquarantine condition.

## Rollback

The branch is non-deploying. Rollback is a protected revert after merge. No production configuration, route ownership, credentials, or data are changed by this lane.

## Completion definition

This lane may be called source-complete only after exact-head typecheck, unit suite, static production build, isolated browser suite, retained artifacts, Drive ledger update, serialized handoffs, and honest browser/device matrix status. Independent physical-device and assistive-technology review remains required before a global accessibility completion claim.
