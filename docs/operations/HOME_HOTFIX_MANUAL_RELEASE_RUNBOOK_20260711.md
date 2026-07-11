# URAI Home hotfix — owner-run hosting-only release runbook

## Purpose

This is a fail-closed manual release path for the `/home` stacking hotfix while GitHub-hosted Actions jobs remain queued before runner assignment.

## Frozen source

- Release SHA: `791416e7cee781d482ef8225e3bef1097532a64d`
- Immediate predecessor / rollback candidate: `ed887ac07ae0a10c0cc212c0f89ae6e10c6def21`
- Firebase project: `urai-4dc1d`
- Deployment scope: Firebase Hosting only

The release SHA contains only the route-layering hotfix merged by PR #543. The rollback candidate is the exact parent commit. This runbook does not claim the rollback candidate is the last independently proven production deployment; it is the source-level immediate predecessor reserved for emergency rollback.

## Owner-only execution

Run in authenticated Google Cloud Shell. The command verifies the exact detached SHA, validates the parent relationship, installs frozen dependencies, runs the regression contract, typechecks, builds, invokes the repository's fail-closed release operator, and performs its built-in post-deploy smoke.

```bash
set -euo pipefail

TARGET_SHA=791416e7cee781d482ef8225e3bef1097532a64d
ROLLBACK_SHA=ed887ac07ae0a10c0cc212c0f89ae6e10c6def21
PROJECT_ID=urai-4dc1d
WORKDIR="$HOME/urai-spatial-home-hotfix"

rm -rf "$WORKDIR"
git clone https://github.com/LifeLoggerAI/urai-spatial.git "$WORKDIR"
cd "$WORKDIR"
git checkout --detach "$TARGET_SHA"

test "$(git rev-parse HEAD)" = "$TARGET_SHA"
test -z "$(git status --porcelain)"
git merge-base --is-ancestor "$ROLLBACK_SHA" "$TARGET_SHA"

gcloud config set project "$PROJECT_ID"
npm install --global pnpm@10.0.0
pnpm install --frozen-lockfile
pnpm exec firebase login:list

node --test urai-tier1/tests/route-layering-hotfix-contract.test.mjs
pnpm --dir urai-tier1 typecheck
NEXT_PUBLIC_URAI_BUILD_SHA="$TARGET_SHA" pnpm --dir urai-tier1 build

FIREBASE_PROJECT_ID="$PROJECT_ID" \
URAI_EXPECTED_FIREBASE_PROJECT="$PROJECT_ID" \
NEXT_PUBLIC_URAI_BUILD_SHA="$TARGET_SHA" \
URAI_TARGET_SHA="$TARGET_SHA" \
ROLLBACK_SHA="$ROLLBACK_SHA" \
URAI_LIVE_BASE_URL=https://urai.app \
URAI_DEPLOY_CONFIRM=DEPLOY_STATIC_URAI \
pnpm live:deploy
```

## Stop conditions

Do not bypass any failure. Stop if:

- the checked-out SHA differs;
- the worktree is dirty;
- the rollback SHA is not an ancestor;
- Firebase login is missing;
- the selected project is not `urai-4dc1d`;
- frozen install, regression test, typecheck, build, release verification, deploy, fingerprint check, or live smoke fails.

## Required receipt

After success, preserve:

- `deployment-receipt/791416e7cee781d482ef8225e3bef1097532a64d/receipt.json`;
- `urai-tier1/out/release-fingerprint.json`;
- terminal output showing Firebase Hosting completion;
- post-deploy smoke output;
- a fresh desktop and mobile screenshot of `https://urai.app/home`.

## GitHub Actions status

This is an emergency owner-operated path only. The canonical protected workflow remains `.github/workflows/spatial-live-deploy.yml`, and GitHub Actions runner-assignment issue #450 must remain open until exact-head hosted-runner verification and retained artifacts work normally.
