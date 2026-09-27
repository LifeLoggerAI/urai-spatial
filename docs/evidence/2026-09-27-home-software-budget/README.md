# Home software-rendering candidate — 2026-09-27

Parent PR1360 exact `432dec84834ca622ca72b8c14e40cc712e9b349c` remains stable while its Home/accessibility/reference captures run.

## New primary evidence

Canonical journey run36300555156 passed on that exact head. Artifact10925596655 SHA256 `7bd319e2c9f3b94c96180df1426f4b0ffb1ad749427787722c24cab5dd226247` downloaded and verified; all31 PNGs inspected. Desktop pointer/keyboard with real Ascent, simulated mobile touch and reduced-motion keyboard traverse the canonical journey and return to rendered Home. This is functional/rendered journey proof, not whole-estate acceptance. Portrait Orb clipping and unaccepted materials persist.

Strict Passport run36300555142 failed. Artifact10925787146 SHA256 `44727075b336cb711f142d2527459194707dea3a0343c90b1a010b0f0e12dd4e` downloaded and verified. The return-frame poll exceeds5s; trace evaluateExpression lasts8081ms after Home assets-ready. Other actions include12170ms Home-ready expectation and15542ms navigation wait. No deadline changes are authorized or included.

## Candidate change

Home currently requests DPR1 even on CPU WebGL. This candidate bounds software-renderer rasterization to320,000 pixels, responsive to viewport resizing. At1440x900 DPR is about0.497 (24.7% of prior pixels). At390x844 it is about0.986. Hardware DPR remains1. DOM controls/text, geometry, camera, assets and semantics are unchanged. The fallback can look softer on large CPU-only viewports: its actual image quality and responsiveness must be inspected before acceptance. It is not a benchmark result or claimed fix for the measured delay.

The fallback is selected from actual WebGL renderer identity, not automation/test flags. Fourteen budget/cadence behavior tests and runtime TypeScript pass. Production build is recorded in the PR after completion. Existing five-second Passport and all visual assertions stay unchanged. Stacked-base registrations allow the existing capture workflows to verify this candidate.

Implemented: yes. Repaired rendering inspected: pending. Independent acceptance/merge/deploy/live verification: no. No new assets promoted, private media published, provider/security permissions altered, Gaussian compute started or release quarantine bypassed.
