# URAI Spatial Live Status

This file records the current public live-release state for URAI Spatial.

## Current state

Status: not-yet-verified-live

Reason: repository-side release gates and deploy workflow are wired, but a Firebase project, deploy credential, deployed live URL, and passing live smoke result have not been recorded yet.

## Release candidate

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical manifest: `release/urai-spatial-live-manifest.json`
- Release gate: `pnpm live:check`
- Deploy command: `FIREBASE_PROJECT_ID=<project-id> pnpm live:deploy`
- Post-deploy smoke: `HOST=https://<live-host> pnpm smoke`

## Last verified live deployment

- Commit: pending
- Firebase project: pending
- Live URL: pending
- Deploy method: pending
- Release gate result: pending
- Live smoke result: pending
- Verified by: pending
- Verified at: pending

## Completion rule

Do not change `Status` to `live-verified` until all of these are true:

- `pnpm live:check` passes against the exact commit being deployed.
- The Firebase deploy completes against the intended project.
- The public live URL is known.
- `HOST=https://<live-host> pnpm smoke` passes against the deployed URL.
- The commit, Firebase project, live URL, and smoke result are recorded here.

## Provider claims

Until provider integrations are connected, consented, deployed, and validated, the release must keep these claims disabled or fallback-only:

- AR: disabled until provider validation.
- WebXR: disabled until provider validation.
- Wearables: disabled until provider validation.
- Biometrics: privacy-safe fallback only until provider validation.
- Memory grounding: demo/fallback only until provider validation.
