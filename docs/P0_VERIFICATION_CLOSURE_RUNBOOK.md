# P0 Verification Closure Runbook

Generated: 2026-07-07  
Updated: 2026-07-14  
Repository: `LifeLoggerAI/urai-spatial`  
Runtime root: `urai-tier1`  
Tracking issue: #461  
Ledger: `docs/V1_V100_VERIFICATION_LEDGER.md`

## Purpose

This runbook turns the V1-V100 verification ledger into an executable closure pass. It does not add product scope. It closes the evidence gaps that block safe public claims.

## Current release authority

- `.github/workflows/spatial-live-deploy.yml` is verification-only and records a **NO-GO** classification.
- `scripts/live-release.mjs` and Firebase Hosting recovery functions fail closed without loading provider credentials or attempting mutation.
- `.github/workflows/capture-legacy-hosting-recovery.yml` is checks-only and exposes no production environment or Firebase secret.
- Local Firebase deployment, workflow-based deployment, rollback, and legacy recovery capture are not approved while provider identity and historical-key closure remain unproven.
- Restoring production authority requires a separately reviewed change after external-account WIF trust, least-privilege IAM, historical-key revocation, negative-auth proof, audit-log review, and protected runtime read-back are documented.

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

### 4. Preserve the production NO-GO boundary

Do not dispatch a production deploy or rollback. The canonical workflow accepts only an exact reviewed SHA for source verification and cannot load production credentials or execute Firebase mutation.

Before any future release-authority restoration is proposed, record all of the following outside repository CI:

- historical Google/Firebase credentials revoked;
- old-credential negative authentication proof;
- Cloud Audit Logs reviewed for unexpected use;
- external-account WIF trust conditions and least-privilege IAM bindings confirmed;
- protected runtime identity configuration installed and read back;
- repository/environment secret settings inspected;
- protected staging validation tied to an exact reviewed source SHA;
- genuine eligible non-author security/runtime approval.

A source-green PR is not provider closure and must not change the estate from NO-GO.

### 5. Preserve recovery without credential exposure

The legacy Hosting-recovery workflow is verification-only. It must not discover, restore, or deploy a Hosting version; access the protected production environment; or receive service-account JSON, private-key, client-email, access-token, or Firebase CLI credentials.

Provider recovery metadata must be captured only after a keyless provider identity and independent authorization exist. Until then, preserve existing source receipts and record recovery as unavailable rather than reintroducing a long-lived key.

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
3. provider-side key revocation, negative-auth, audit-log, WIF/IAM, protected-settings, and runtime read-back evidence exists;
4. a separately reviewed keyless release authority completed deployment and live route/content/query parity;
5. `/privacy-controls` and `/status` match the current source boundary;
6. desktop and mobile evidence is captured and reviewed;
7. ledgers and trackers are updated from evidence;
8. unsafe V1-V100 production claims remain blocked unless their own receipts prove them.
