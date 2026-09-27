# Replay rendered-state proof repair

Parent: PR1363 exact896d558a63253d2d51d1e30fb4439700bb5301b7. Active parent and Gaussian work remain unchanged.

Production Verify36302153137 on c58df391 had a missing heading/unwind bounding box failure on attempt1 (artifact10925847049). A single unchanged retry succeeded, but literal inspection of both retained retry PNGs in artifact10925704335 showed only controls over a blank background. This is not visual acceptance. Retry archive SHA256: db6d76caf2723ede16997658f9c591580256980fb0fea2e3c04a5924c138439b.

The production test now requires the existing data-replay-render-ready=true signal before measuring controls or retaining screenshots. ReplaySpatialScene loads its model and demo texture through Suspense; the existing signal only appears after its rendered-frame callback runs. No runtime, camera, asset, deadline or existing assertion is changed. The existing30s attribute helper remains in use. A Playwright trace is retained on both success and failure to diagnose navigation/geometry timing instead of assigning a cause from a later screenshot.

Syntax and diff checks pass locally. Actual exact-head browser proof must finish and its retained pixels must be inspected before this repair is considered verified. No independent acceptance, production merge, deployment, live pass or AAA+++ claim.
