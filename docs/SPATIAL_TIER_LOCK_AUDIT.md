# URAI Spatial Tier Lock Audit

This document turns the Home, Ascent, Life Map, Focus, Replay, and Mirror audit into repo-owned checks and a repeatable lock process.

## Lock stance

Tier-1 through Tier-5 are not considered lockable until scripted checks, frame audit, and manual screenshot review are green. Visual correctness is not enough. The lock must prove route behavior, camera movement, return behavior, keyboard unwind, race-condition safety, loading-state stability, and back-stack/deep-link behavior.

## Required screen states

- Home: sky click target and Begin Ascent must both enter Ascent without duplicate timers or blank loading flashes.
- Ascent: auto-transition must resolve to Life Map inside the lock timing window; keyboard unwind during Ascent must return Home or otherwise follow the documented contract.
- Life Map: demo stars must render, be clickable, and preserve route state when entering Focus.
- Focus: selected memory context must be preserved and Start Replay must enter Replay.
- Replay: keyboard unwind and Unwind must return exactly one layer to Focus.
- Mirror: route must expose return affordance, sync copy, loading/empty/error/success posture, and deterministic back behavior.

## Commands

Run from the repository root:

```bash
pnpm install
pnpm typecheck
pnpm --filter urai-tier1 test:unit
pnpm test:e2e
pnpm test:e2e:navigation-stack
pnpm test:e2e:camera-transitions
pnpm test:e2e:race-conditions
pnpm test:e2e:data-states
pnpm test:visual:spatial
pnpm test:tier-lock-hardening
pnpm --filter urai-tier1 urai:tier1
pnpm --filter urai-tier1 urai:tier2
pnpm --filter urai-tier1 urai:tier3
pnpm --filter urai-tier1 urai:tier4
pnpm --filter urai-tier1 urai:tier5
```

For video audit:

```bash
node scripts/audit-video-frames.mjs path/to/recording.webm artifacts/video-frame-audit
```

## P0 checks encoded in `tests/spatial-tier-lock-hardening.mjs`

- Home -> Ascent -> Life Map -> Focus -> Replay happy path.
- Keyboard unwind Replay -> Focus -> Life Map -> Home.
- Browser back/forward after stack unwind.
- Ascent timing window.
- Reset View stability in Focus.
- Rapid Begin Ascent and keyboard race coverage.
- Keyboard spam from Replay.
- Focus/Replay missing-manifest fallback behavior.
- Mirror route evidence and Mirror return contract.
- Desktop and mobile screenshot capture.

## Known strictness

The hardening suite is intentionally strict. If a behavior is only visually implied, the suite should either assert it or leave an artifact proving it still needs product/engineering follow-up. Do not mark a tier lock green because the screen looks right in a still screenshot.

## Manual review after scripts

Review artifacts under:

- `artifacts/spatial-lock`
- `artifacts/spatial-tier-lock-hardening`
- `artifacts/video-frame-audit`

Manual review must check for:

- UI flicker or loading flash.
- Layout shift after route settle.
- Dropped frames or jank in the extracted video timeline.
- Incorrect CTA copy or conflicting return affordances.
- Broken hover, focus, click, and keyboard states.
- State loss on refresh, deep-link, browser back, and browser forward.
