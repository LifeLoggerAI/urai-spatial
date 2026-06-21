# URAI Live Visual Audit Interaction Blockers

Date: 2026-06-21
Base URL: https://urai.app

## Latest audit summary provided from GitHub Actions

- Routes audited: 11
- Screenshots expected: 11
- Old demo copy routes: none
- Production copy routes: `/`, `/home`, `/spatial`, `/life-map`, `/life-map?star=blue-fog`, `/focus?memoryId=quiet-reset`, `/replay?manifestId=replay-recovery-thread`, `/mirror`, `/passport`, `/status`, `/privacy-controls`
- Failed interactions: 2

## Failed interactions

1. `home-to-life-map`
   - Failure: audit matched an `a[href="/life-map"]` that was not visible.
   - Required fix: prioritize visible product route controls or visible-only selectors.

2. `focus-to-replay`
   - Failure: audit matched an `a[href*="/replay"]` that was not visible.
   - Required fix: keep a visible Focus-to-Replay control in the production surface and prioritize visible-only selectors.

## Status

The route content gate is clean. Remaining launch blocker is interaction targeting/clickability, not route availability or old demo copy.
