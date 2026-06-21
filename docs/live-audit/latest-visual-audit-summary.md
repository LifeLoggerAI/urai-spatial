# URAI live visual audit

Base URL: https://urai.app
Created: 2026-06-21T18:08:56.393Z

## Summary

- Routes audited: 11
- Screenshots expected: 11
- Old demo copy routes: none
- Production copy routes: /, /home, /spatial, /life-map, /life-map?star=blue-fog, /focus?memoryId=quiet-reset, /replay?manifestId=replay-recovery-thread, /mirror, /passport, /status, /privacy-controls
- Failed interactions: 2

## Interactions

- FAIL home-to-life-map: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('a[href="/life-map"]').first()
    - locator resolved to <a href="/life-map">…</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable

- PASS life-map-to-focus: https://urai.app/focus/?memoryId=quiet-reset
- FAIL focus-to-replay: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('a[href*="/replay"]').first()
    - locator resolved to <a href="/replay?manifestId=replay-recovery-thread">…</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    5 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 500ms
    - waiting for element to be visible, enabled and stable

- PASS passport-to-status: https://urai.app/status
