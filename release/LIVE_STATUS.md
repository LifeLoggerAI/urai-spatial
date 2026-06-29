# URAI Spatial Live Status

This file records the current public live-release state for URAI Spatial.

## Current state

Status: deployed-but-final-live-smoke-required

Reason: XR verification and a Firebase deploy have been observed, and the repository now has strict release/smoke workflows. However, the known live root URL is reachable but still serves transitional launch/build-finalizing copy instead of the current committed `HomeWorldProduction` public surface. The public surface is not locked until a latest-main deploy passes strict live smoke.

## Release candidate

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical manifest: `release/urai-spatial-live-manifest.json`
- Release gate: `pnpm live:check`
- Deploy workflow: `Firebase XR Deploy`
- Post-deploy workflow: `URAI Spatial Post Deploy Verify`
- Firebase project observed in deploy logs: `urai-4dc1d`
- Live URL observed in deploy logs: `https://urai-4dc1d.web.app`

## Last observed deployment evidence

- Commit: deployed commit not conclusively recorded in repo evidence
- Firebase project: `urai-4dc1d`
- Live URL: `https://urai-4dc1d.web.app`
- Deploy method: local Firebase CLI deploy observed in operator logs
- XR gate result: passed, 14 tests, 0 failures
- Firebase Hosting result: deploy complete in operator logs
- SSR function result: `ssrurai4dc1d` updated successfully in operator logs
- Live smoke result: blocked; live root has returned transitional launch/build-finalizing copy
- Verified by: operator logs plus repository evidence pass
- Verified at: 2026-06-29

## Current live blocker

The known live root URL has returned:

```text
Launch build is compiling successfully. Full app deployment is being finalized.
```

This is not the committed production root surface. Current `main` renders `TierOneExperience mode="home"`, which renders `HomeWorldProduction`.

## Completion rule

Do not change `Status` to `live-verified` until all of these are true:

- `pnpm live:check` passes against the exact commit being deployed.
- The Firebase deploy completes against the intended project.
- The public live URL is known.
- The public root renders the committed `HomeWorldProduction` surface rather than transitional copy.
- `URAI_DEPLOY_URL=https://<live-host> pnpm smoke:home-xr:live` passes.
- `URAI_DEPLOY_URL=https://<live-host> pnpm smoke:live` passes.
- `URAI_DEPLOY_URL=https://<live-host> node scripts/check-home-xr-live-deploy-proof.mjs` passes.
- The commit, Firebase project, live URL, and smoke result are recorded here.

## Provider claims

Until provider integrations are connected, consented, deployed, and validated, the release must keep these claims disabled or fallback-only:

- AR: disabled until provider validation.
- WebXR: disabled until provider validation.
- Wearables: disabled until provider validation.
- Biometrics: privacy-safe fallback only until provider validation.
- Memory grounding: demo/fallback only until provider validation.
