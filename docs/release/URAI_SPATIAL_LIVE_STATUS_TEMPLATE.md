# URAI Spatial Live Status Update Template

Use this template only after all required proof exists.

Do not apply this template to `release/LIVE_STATUS.md` until all of the following are true:
- `pnpm live:check` passed on the locked release candidate SHA
- deploy completed from that same SHA
- live smoke passed against the intended live URL from that same SHA
- Firebase project ID is confirmed
- live URL is confirmed
- gate, deploy, smoke, and ledger all reference the same locked SHA
- preserved artifacts exist for at least the passing release gate and passing live smoke run

## Template

```md
# URAI Spatial Live Status

This file records the current public live-release state for URAI Spatial.

## Current state

Status: live-verified

Reason: repository-side release gates, deploy workflow, live smoke, and recorded ledger evidence all passed for one locked release candidate SHA.

## Release candidate

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical manifest: `release/urai-spatial-live-manifest.json`
- Release gate: `pnpm live:check`
- Deploy command: `FIREBASE_PROJECT_ID=<project-id> pnpm live:deploy`
- Post-deploy smoke: `HOST=https://<live-host> pnpm smoke`

## Last verified live deployment

- Commit: <LOCKED_RELEASE_SHA>
- Firebase project: <PRODUCTION_FIREBASE_PROJECT_ID>
- Live URL: <INTENDED_LIVE_URL>
- Deploy method: <github-actions-or-workstation>
- Release gate result: passed
- Live smoke result: passed
- Verified by: <RELEASE_OWNER_OR_VERIFIER>
- Verified at: <ISO_TIMESTAMP>

## Completion rule

This status is valid only because all of these are true:

- `pnpm live:check` passed against the exact commit being deployed.
- The Firebase deploy completed against the intended project.
- The public live URL is known.
- `HOST=https://<live-host> pnpm smoke` passed against the deployed URL.
- The commit, Firebase project, live URL, and smoke result are recorded here.

## Provider claims

Until provider integrations are connected, consented, deployed, and validated, the release must keep these claims disabled or fallback-only:

- AR: disabled until provider validation.
- WebXR: disabled until provider validation.
- Wearables: disabled until provider validation.
- Biometrics: privacy-safe fallback only until provider validation.
- Memory grounding: demo/fallback only until provider validation.
```

## Current Decision Before Missing Confirmations Are Supplied

`NO-GO`
