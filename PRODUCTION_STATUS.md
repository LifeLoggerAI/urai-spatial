# URAI Spatial Production Status

Last updated: 2026-06-30

## Current verdict

DONE BUT NEEDS EXTERNAL ENV.

The source tree has been tightened for production-proof behavior, but this repository must not be marked fully production-ready until the Firebase deploy workflow, post-deploy verification workflow, build/test gate, live commit proof, and physical Quest/WebXR proof are completed with receipts.

## What this repo is

URAI Spatial is a public spatial-preview surface with source-side WebXR progressive-enhancement support and a demo/local Life Map preview. It is safe to describe as a public preview. It is not yet verified as a production Quest/WebXR app or authenticated private Life Map runtime.

## What is live

- The custom domain public preview is live at https://urai.app.
- Public copy is conservative and keeps private data, autonomous actions, and headset entry gated until proof passes.

## What is demo-gated

- Life Map public data is owner-safe demo or local fallback until authenticated persistence is proven.
- Replay and Passport remain owner-gated on the public preview.
- Quest/WebXR support remains unverified until physical device proof is attached.

## Required environment

The workflows require the existing Firebase and XR runtime secrets configured in GitHub Actions. Do not print, commit, or expose secret values.

Required deploy proof environment during build/deploy:

- NEXT_PUBLIC_GIT_SHA
- SOURCE_VERSION
- FIREBASE_PROJECT_ID or equivalent Firebase project environment

The Firebase deploy workflow now sets the git SHA values from the workflow commit.

## Local verification commands

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm bootstrap:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
pnpm build:static
pnpm xr:verify
pnpm lock:all
```

## Deploy command path

Preferred path is GitHub Actions, not manual local deploy:

1. Run workflow: Firebase XR Deploy
   - deploy_target: hosting
   - live_url: https://urai-4dc1d.web.app
2. Run workflow: URAI Spatial Post Deploy Verify
   - live_url: https://urai-4dc1d.web.app
3. Run workflow: URAI Spatial Post Deploy Verify
   - live_url: https://urai.app

## Live smoke commands

```bash
URAI_DEPLOY_URL=https://urai.app REQUIRE_LIVE_COMMIT_SHA=true pnpm smoke:home-xr:live
URAI_DEPLOY_URL=https://urai.app REQUIRE_LIVE_COMMIT_SHA=true pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app REQUIRE_LIVE_COMMIT_SHA=true pnpm smoke:home-xr:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app REQUIRE_LIVE_COMMIT_SHA=true pnpm smoke:live
```

## Known limitations

- Firebase default hosting previously served stale placeholder copy and must be redeployed.
- Latest-main GitHub status checks were absent during the connector pass.
- Physical Meta Quest Browser WebXR entry has not been verified.
- Authenticated server-side Life Map persistence has not been proven.

## Production-ready acceptance

This repo can be marked production-ready only when:

- local or CI install/typecheck/lint/test/build gates pass
- Firebase default host and custom domain serve the same current release
- `/api/system/deploy-proof` reports a known commit SHA matching the audited commit
- stale placeholder copy is absent on all smoke routes
- Life Map public/demo boundaries remain truthful or authenticated persistence is proven
- Meta Quest Browser WebXR session proof is attached before any Quest-ready claim
