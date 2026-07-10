# URAI Proof Machine

This is the repeatable proof-only V1 route and visual verification loop.

## Current authority

- `scripts/aaa-launch-proof.mjs` runs install, asset checks, typecheck, unit tests, build, production-authority audit, route-exposure checks, copy-policy checks, and optional live screenshots.
- The proof runner writes receipts under `$HOME/urai-final-receipts` or `URAI_RECEIPT_ROOT`.
- It never deploys production. Passing `--deploy` fails closed.
- `.github/workflows/spatial-live-deploy.yml` is the sole production deployment authority.

The retired `scripts/urai-proof-loop.mjs` deploy path must not be restored or used.

## Fast proof of an already-built live surface

```bash
node scripts/aaa-launch-proof.mjs \
  --base=https://urai.app \
  --screenshots \
  --skip-install \
  --skip-assets \
  --skip-typecheck \
  --skip-test \
  --skip-build
```

This checks authority, route exposure, copy policy, live route fingerprints, interaction paths, and desktop/mobile screenshots without publishing anything.

## Full local proof

```bash
node scripts/aaa-launch-proof.mjs --base=https://urai.app --screenshots
```

Expected final line:

```text
URAI AAA proof passed. Receipt: <receipt-directory>
```

The receipt records `productionDeploymentAttempted: false` and identifies `.github/workflows/spatial-live-deploy.yml` as production authority.

## Production release

Do not run a local Firebase deploy command. After an exact candidate is merged and all required checks pass:

1. Freeze the exact `main` SHA.
2. Record a distinct proven rollback ancestor and rollback command.
3. Dispatch **URAI Canonical Production Release** with the required `DEPLOY_URAI_APP` confirmation and Firebase project `urai-4dc1d`.
4. Preserve the workflow verification, deployment, rollback, route, query, Status, Privacy Controls, and screenshot receipts.
5. Treat the deployment as unverified until the custom-domain smoke proves the exact deployed SHA.

## Human visual verdict order

1. Life Map and Location Map blank-tail check.
2. Ground world realism.
3. Replay cinematic memory film.
4. Focus chamber depth.
5. Mobile crop pass.
6. Final V1 receipt.

## Honest gates

- Route proof green does not equal visual AAA+++.
- Screenshot proof green does not equal Quest proof.
- Quest proof stays manual until actual Quest Browser evidence is captured.
- Source implementation does not equal production certification.
