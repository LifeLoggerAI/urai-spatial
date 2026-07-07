# P0 Verification Closure Runbook

Generated: 2026-07-07
Repository: `LifeLoggerAI/urai-spatial`
Runtime root: `urai-tier1`
Tracking issue: #461
Ledger: `docs/V1_V100_VERIFICATION_LEDGER.md`

## Purpose

This runbook turns the V1-V100 verification ledger into an executable closure pass.

The goal is not to add new product scope. The goal is to close the evidence gaps that block safe public claims.

## Current authority reality

PR #415 was the previous canonical V50 runtime/release-gate authority, but it is closed, unmerged, and non-mergeable. Its body still contains useful requirements:

- exact target SHA;
- distinct rollback ancestor;
- receipt-backed Status source;
- fail-closed release receipt;
- manual production dispatch;
- immutable deployment receipt;
- route/query/content/SHA verification;
- Firebase Hosting-only static release boundary.

Because PR #415 is closed and unmerged, do not treat it as an active merge path. Treat it as a requirements reference. Current closure should happen on current `main` or a fresh branch based on current `main`.

## Non-negotiable claim boundary

Until this runbook passes, public copy may say:

> URAI Spatial is reachable as a privacy-safe fallback/demo spatial shell with a substantial V1 web experience, public route proof, receipt infrastructure, V1 asset evidence, and future provider seams.

Public copy must not say:

> V1-V100 are complete, production-certified, provider-active, device-certified, backend-integrated, or externally verified end-to-end.

## P0 closure sequence

### 1. Clean current-main workspace

```bash
git checkout main
git pull --ff-only
cd urai-tier1
corepack enable
corepack pnpm install --frozen-lockfile
```

Record:

```bash
git rev-parse HEAD
git status --short
```

Required result:

- exact current-main SHA captured;
- working tree state captured;
- no untracked evidence files left outside the intended receipt path.

### 2. Run source verification

From `urai-tier1`:

```bash
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm run audit:routes
corepack pnpm run tier1:verify
corepack pnpm run tier5:verify
```

Required result:

- command output saved verbatim;
- exit code saved for each command;
- failure output preserved if any command fails.

### 3. Run route/content parity verification

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
- `/asset-audit`
- `/tier3`
- `/tier4`
- `/tier5`

For each route, record:

- URL;
- slash and non-slash behavior where applicable;
- HTTP status;
- final URL;
- content hash;
- byte count;
- required route fingerprint/marker;
- forbidden marker checks for route drift;
- query preservation for Focus and Replay;
- any available deployed-SHA metadata/header.

Required result:

- `/privacy-controls` must render Privacy Controls content, not Home threshold content;
- `/status` must render production truth and not overclaim unreceipted routes;
- live route reachability must be tied to tested/deployed SHA evidence where available.

### 4. Record deployment identity

Before production claim:

- exact tested SHA;
- exact deployed SHA;
- previous rollback SHA;
- Firebase project/target;
- deployment command or workflow run;
- deployment receipt path;
- rollback command;
- operator/time metadata.

Required result:

- immutable deployment receipt exists;
- rollback target is distinct from deployed SHA;
- Status route can cite or render the same truth boundary.

### 5. Capture visual evidence

Capture desktop and mobile screenshots for the live route family.

Required result:

- screenshots saved under a dated receipt folder;
- screenshot index includes route, viewport, timestamp, and file path;
- human review notes classify each route as pass/review/block.

### 6. Update ledgers

After evidence exists, update:

- `docs/V1_V100_VERIFICATION_LEDGER.md`;
- `docs/completion-ledger.md` if still authoritative as a mirror;
- `docs/LAUNCH_VERIFICATION_STATE.md`;
- `STATUS.md`;
- any machine-readable receipt file used by Status or launch surfaces.

Required result:

- V1 can only move greener if exact deploy/rollback/route/screenshot proof exists;
- V2/V3/V4/V5 remain gated unless their provider/device/provenance receipts exist;
- V100 remains roadmap until production services/privacy/jobs/analytics/monitoring/rollback are verified.

## Failure handling

If any command fails, do not patch docs to hide the failure. Record:

- command;
- exit code;
- failure output;
- suspected owner;
- next fix.

Then keep the affected claim blocked.

## Done definition

Issue #461 can close only when:

1. exact deployed SHA and rollback SHA are recorded;
2. source verification output exists for current main;
3. live route/content parity passes;
4. `/privacy-controls` and `/status` are externally verified against correct content boundaries;
5. screenshots are captured/reviewed;
6. ledgers are updated with evidence, not assumptions;
7. unsafe V1-V100 production claims remain blocked unless receipts prove them.
