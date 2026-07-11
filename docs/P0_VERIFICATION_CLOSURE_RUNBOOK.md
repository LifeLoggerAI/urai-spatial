# P0 Verification Closure Runbook

Generated: 2026-07-07  
Updated: 2026-07-10  
Repository: `LifeLoggerAI/urai-spatial`  
Runtime root: `urai-tier1`  
Tracking issue: #461  
Ledger: `docs/V1_V100_VERIFICATION_LEDGER.md`

## Purpose

This runbook turns the V1-V100 verification ledger into an executable closure pass. It does not add product scope. It closes the evidence gaps that block safe public claims.

## Current release authority

- `.github/workflows/spatial-live-deploy.yml` is the sole production deploy and rollback authority.
- `scripts/live-release.mjs` refuses deployment outside that protected manual workflow.
- Production and rollback both use the protected `production` environment.
- Local `firebase deploy`, `pnpm live:deploy`, and retired proof-loop deploy commands are not approved release paths.
- An exact tested SHA, a distinct proven rollback SHA, current live smoke, and immutable workflow artifacts are required before a production claim.

## Non-negotiable claim boundary

Until this runbook passes, public copy may say:

> URAI Spatial is reachable as a privacy-safe fallback/demo spatial shell with a substantial V1 web experience, public route proof, receipt infrastructure, V1 asset evidence, and future provider seams.

Public copy must not say:

> V1-V100 are complete, production-certified, provider-active, device-certified, backend-integrated, or externally verified end-to-end.

## P0 closure sequence

### 1. Freeze a clean candidate

```bash
git checkout main
git pull --ff-only
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
git rev-parse HEAD
git status --short
```

Required result:

- one exact 40-character current-main SHA;
- clean working tree;
- no untracked evidence files outside the intended receipt path;
- one distinct rollback SHA that is an ancestor of the candidate and is already proven safe enough to restore.

### 2. Run source verification

From the repository root, use the exact repository-prescribed commands and preserve their output:

```bash
node scripts/aaa-launch-proof.mjs
node scripts/audit-production-workflow-authority.mjs
node scripts/audit-spatial-performance-budget.mjs
pnpm --dir urai-tier1 receipt:assets
pnpm --dir urai-tier1 typecheck
pnpm --dir urai-tier1 verify:aaa-world
pnpm --dir urai-tier1 xr:verify
```

Also allow the exact-head required GitHub workflows to complete. A local pass is not a substitute for current-head protected CI.

Required result:

- exact source SHA and clean-tree state in receipts;
- command output and exit status preserved;
- provider asset verification reports `ok: true` before the asset receipt is materialized;
- failures remain visible and block release.

### 3. Run route and content parity verification

Required route families:

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus?memoryId=quiet-reset`
- `/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread`
- `/mirror`
- `/passport`
- `/status`
- `/privacy-controls`
- `/location-map`
- `/spatial/ar-vr`
- `/demo`
- `/demo/replay-film`

For each route, record URL, slash behavior, HTTP status, final URL, content fingerprint, byte count, required and forbidden markers, query preservation, browser errors, and deployed-SHA evidence.

Required result:

- `/privacy-controls` renders Privacy Controls, not Home threshold content;
- `/status` reports current evidence boundaries and does not claim certification without receipts;
- Focus and Replay preserve memory and manifest identity;
- live reachability is tied to the exact deployed SHA.

### 4. Deploy through the protected workflow

Before dispatch:

- all required checks on the exact candidate are successful;
- the candidate is merged to `main`;
- `release_sha` is the exact current `main` SHA;
- `rollback_sha` is a distinct proven ancestor;
- Firebase project is `urai-4dc1d`;
- the protected environment has the required service account and approvals.

Approved production dispatch:

```bash
gh workflow run spatial-live-deploy.yml \
  --ref main \
  -f release_sha=<EXACT_CURRENT_MAIN_SHA> \
  -f rollback_sha=<DISTINCT_PROVEN_PRODUCTION_SHA> \
  -f confirm=DEPLOY_URAI_APP
```

Do not run the command until the exact values are known. The workflow verifies, checks out, builds, deploys, smokes, and records only the requested target SHA.

Required deployment evidence:

- exact tested and deployed SHA;
- distinct rollback SHA;
- workflow run ID and protected environment;
- Firebase project and hosting-only scope;
- build/output hashes;
- custom-domain route, query, Status, and Privacy Controls smoke;
- desktop and mobile screenshots;
- immutable deployment and provider-verification artifacts;
- protected rollback command.

### 5. Roll back through the same protected workflow

The deployment receipt writes the exact recovery command. Its form is:

```bash
gh workflow run spatial-live-deploy.yml \
  --ref main \
  -f release_sha=<PROVEN_ROLLBACK_SHA> \
  -f rollback_sha=<PROVEN_ROLLBACK_SHA> \
  -f confirm=ROLLBACK_URAI_APP
```

The workflow requires the rollback target to be a non-current ancestor of `main`, re-runs verification against that target, uses the protected production environment, deploys the exact ancestor, and repeats live smoke. Never perform rollback through a local Firebase command.

### 6. Capture visual evidence

Run the proof-only visual pass against the deployed domain:

```bash
LOOP_NAME=post-deploy-live node scripts/aaa-launch-proof.mjs \
  --base=https://urai.app \
  --screenshots \
  --skip-install \
  --skip-assets \
  --skip-typecheck \
  --skip-test \
  --skip-build
```

Use skip flags only when the same exact SHA already has trusted evidence for the omitted steps. Review the 28 desktop/mobile screenshots and classify each route as pass, review, or block.

### 7. Update ledgers

After evidence exists, update:

- `docs/V1_V100_VERIFICATION_LEDGER.md`;
- `docs/completion-ledger.md` if still authoritative as a mirror;
- `docs/LAUNCH_VERIFICATION_STATE.md`;
- `STATUS.md`;
- issue #461;
- machine-readable receipt files used by Status or launch surfaces.

V1 may move greener only when exact deploy, rollback, route, and screenshot evidence exists. V2-V5 and V100 remain gated unless their own provider, device, provenance, service, privacy, and operations receipts exist.

## Failure handling

If any command or workflow fails, preserve the command, exact SHA, exit status, log, owner, and next fix. Do not edit documentation to hide the failure, weaken the check, or substitute evidence from an older commit.

## Done definition

Issue #461 can close only when:

1. exact deployed SHA and distinct rollback SHA are recorded;
2. exact-head source and CI verification output exists;
3. the protected workflow completed deployment and live smoke;
4. live route/content/query parity passes;
5. `/privacy-controls` and `/status` match the current source boundary;
6. desktop and mobile evidence is captured and reviewed;
7. ledgers and trackers are updated from evidence;
8. unsafe V1-V100 production claims remain blocked unless their own receipts prove them.
