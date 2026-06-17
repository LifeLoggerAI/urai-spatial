# Tier 5 CI Browser Proof Plan

This adds a GitHub Actions browser proof workflow for Tier 5.

Purpose:
- run Tier 5 local production gates on a clean Ubuntu runner
- install Playwright Chromium with system dependencies
- run Playwright runtime verification
- run browser E2E lock
- run full live check without deploy

Boundary:
This workflow proves browser/full-release readiness in CI. It does not deploy production and does not claim live release until deploy output, live URL, and live smoke evidence are recorded.
