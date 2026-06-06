# URAI Spatial Live Deploy Runbook

This repo targets Firebase project `urai-4dc1d` through `.firebaserc`.

## Release readiness

Run from repo root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm live:check
```

`pnpm live:check` validates the V1-V5 live release manifest, Tier/XR matrix, required release files, static lock checks, build lock checks, e2e lock checks, tests, and XR verification.

## Deploy

Run from repo root with Firebase deploy credentials available in your shell:

```bash
FIREBASE_PROJECT_ID=urai-4dc1d pnpm live:deploy
```

The deploy command runs the same release gate first, then deploys:

```bash
firebase deploy --project urai-4dc1d --only hosting,firestore:rules,firestore:indexes,functions
```

## Live smoke check

After deploy:

```bash
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
```

If needed, also test:

```bash
URAI_DEPLOY_URL=https://urai-4dc1d.firebaseapp.com pnpm smoke:live
```

## Static hosting path

For static Firebase export hosting:

```bash
FIREBASE_PROJECT_ID=urai-4dc1d pnpm deploy:xr:firebase:static
```

This runs XR verification, builds the static export, and deploys with `firebase.static.json`.

## Release rule

Do not call the repo live unless:

1. `pnpm live:check` passes.
2. Firebase deploy succeeds.
3. `URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live` passes.
