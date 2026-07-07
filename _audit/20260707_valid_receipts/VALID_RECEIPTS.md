# URAI Spatial valid receipt packet

Generated: 2026-07-07
Updated: 2026-07-07 after receipt commit workflow run check
Repository: `LifeLoggerAI/urai-spatial`
Branch: `launch/verification-pr-receipt-20260707`
PR: #460 `Launch verification PR receipt path`
Current PR head SHA: `44db356a9faa5f569986b6354b1769a75c5335c5`
Prior PR head SHA: `650f19834a66a33f920ce77762e187b69f4f0847`
Base branch: `main`
Base SHA observed by PR metadata: `7876116b06241553ee87513c2c6b1977baa4f94b`
Current merge test SHA observed by PR metadata: `8c903d0b4ca3156484df16683b77d0fe4c4b70b4`

## Receipt standard

This file records only connector-observed GitHub receipts. It does not promote URAI Spatial to production-certified unless the required production gates pass and artifacts exist.

A valid production receipt still requires:

- exact head identified;
- install success;
- typecheck success;
- build success;
- route smoke success;
- evidence artifact attached;
- deployed SHA equal to tested SHA if deployed;
- rollback SHA recorded if production deployment is claimed;
- live route parity proven on the public domain.

## Current PR metadata receipt

- PR #460 exists and is open.
- PR #460 is draft.
- PR #460 is mergeable at the time observed.
- Current PR head SHA: `44db356a9faa5f569986b6354b1769a75c5335c5`.
- PR body states the gate: do not merge until exact-head verification receipts are attached, including workflow run id, typecheck result, build result, route smoke artifact, and deployment evidence if deployed.

## Current-head workflow receipts for `44db356a9faa5f569986b6354b1769a75c5335c5`

Observed workflow runs:

| Run ID | Workflow | Status | Conclusion | Receipt value |
|---:|---|---|---|---|
| 28848795463 | URAI Production Verify | in_progress | none | production verify job still running when observed |
| 28848795449 | XR Static Gate Diagnostics | completed | success | static gates passed and artifact uploaded |
| 28848795415 | Privacy adoption check | completed | success | privacy adoption gate passed |
| 28848795522 | Export Spatial E2E Source | completed | success | source export passed |
| 28848795433 | Spatial Missing Resource Diagnostics | completed | success | missing-resource diagnostics passed and artifact uploaded |
| 28848795438 | URAI Spatial CI | completed | failure | mixed result: several jobs passed, two jobs failed at production route exposure |
| 28848795422 | URAI Spatial Release Readiness | completed | failure | failed at static release contract |
| 28848795408 | URAI Spatial Verify | completed | failure | failed at URAI Guardian before install/typecheck/build/release gate |
| 28848795492 | Patch Check | completed | failure | failed at run patch checks |
| 28848795450 | Guardian Diagnostics | completed | failure | not launch-valid |
| 28848795467 | URAI Spatial Firebase Preview | completed | failure | not launch-valid |
| 28848795436 | v60 CI | completed | failure | not launch-valid |

## Current-head artifact receipts

The following artifact receipts were observed and are valid evidence for their individual scopes:

| Run ID | Artifact ID | Artifact name | Digest | Scope |
|---:|---:|---|---|---|
| 28848795449 | 8133354922 | `xr-static-gate-diagnostics` | `sha256:d1c67eae493d9c43b23695e92db275b46120fe5bcbe51a367f769fe79a4dae05` | XR static gate diagnostics |
| 28848795433 | 8133340825 | `spatial-missing-resource-diagnostics` | `sha256:ff16b48ae58c0eaa881ad0c70501560963949bc71a784aba9d55df18af90a39d` | missing-resource diagnostics |
| 28848795438 | 8133572785 | `spatial-lock-artifacts` | `sha256:05ac24e9c267d6bb2a5e110536c76bf0c5d145c9c058cdcc1af12a05f71783fc` | spatial E2E lock artifacts |

## Current-head job-step receipts

### URAI Spatial Verify run `28848795408`

Observed job: `Verify URAI Spatial`, job id `85558839836`.

- Setup, checkout, Corepack, and Node setup succeeded.
- `URAI Guardian` failed.
- install dependencies, public copy check, Firestore boundaries, typecheck, unit tests, build, and release gate were skipped after the guard failure.

This is a valid blocker receipt, not a production pass.

### URAI Spatial Release Readiness run `28848795422`

Observed job: `release-readiness`, job id `85558839700`.

- setup, checkout, Node setup, pnpm setup, and dependency install succeeded.
- `Verify static release contract` failed.
- build release contract, XR contract, static Firebase export, and live smoke were skipped.

This is a valid blocker receipt.

### Patch Check run `28848795492`

Observed job: `pnpm patch:check`, job id `85558839809`.

- setup, checkout, pnpm setup, Node setup, Corepack, and dependency install succeeded.
- `Run patch checks` failed.

This is a valid blocker receipt.

### URAI Spatial CI run `28848795438`

This workflow has mixed valid receipts.

Failed jobs:

- `Tier 1 typecheck build and tests`, job id `85558839702`, failed at `Production route exposure` after install and source integrity passed. Typecheck, tests, build, and downstream locks were skipped.
- `Workspace install and preflight`, job id `85558839710`, failed at `Production route exposure` after install and source integrity passed. Preflight and downstream locks were skipped.

Passed jobs:

- `Firebase config smoke`, job id `85558839718`, passed Firebase JSON validation, Firebase rules/runtime verification, and Firebase Tier-1 boundary lock.
- `Verification lock preflight`, job id `85558839719`, passed preflight and PR lock/signoff guard.
- `Functions build and tests`, job id `85558839728`, passed functions build and functions test.
- `LifeMap targeted fast gate`, job id `85558839746`, passed targeted LifeMap tests.
- `Spatial camera navigation and ESC lock`, job id `85558839767`, passed Playwright install, spatial E2E lock, and artifact upload.

## Prior-head workflow receipts for `650f19834a66a33f920ce77762e187b69f4f0847`

Prior observed workflow runs remain historical evidence, but no longer represent the current PR head after commit `44db356a9faa5f569986b6354b1769a75c5335c5`.

| Run ID | Workflow | Status | Conclusion | Receipt value |
|---:|---|---|---|---|
| 28845011652 | URAI Production Verify | in_progress | none | install and Playwright runtime reached success; verify step in progress when observed |
| 28845011678 | XR Static Gate Diagnostics | completed | success | static gate diagnostics passed |
| 28845011691 | Privacy adoption check | completed | success | required privacy files, launch decision status, and privacy runtime tests passed |
| 28845011724 | Export Spatial E2E Source | completed | success | source artifact exported |
| 28845011683 | Spatial Missing Resource Diagnostics | completed | success | missing-resource diagnostic capture passed |
| 28845011668 | URAI Spatial Firebase Preview | completed | failure | not launch-valid |
| 28845011699 | Patch Check | completed | failure | not launch-valid |
| 28845011664 | URAI Spatial Release Readiness | completed | failure | not launch-valid |
| 28845011718 | Guardian Diagnostics | completed | failure | not launch-valid |
| 28845011734 | URAI Spatial Verify | completed | failure | not launch-valid |
| 28845011779 | v60 CI | completed | failure | not launch-valid |
| 28845011769 | URAI Spatial CI | completed | failure | not launch-valid |

## Current certification statement

As of this receipt packet, URAI Spatial PR #460 is partially evidenced but not production-certified.

Valid positive receipts exist for the current head:

- XR static gate diagnostics;
- privacy adoption check;
- spatial E2E source export;
- missing-resource diagnostics;
- Firebase config/rules/runtime smoke;
- verification lock preflight;
- functions build and tests;
- LifeMap targeted fast gate;
- spatial camera navigation and ESC E2E lock with artifact.

Valid blocker receipts exist for the current head:

- URAI Spatial Verify failure at Guardian;
- URAI Spatial Release Readiness failure at static release contract;
- Patch Check failure;
- URAI Spatial CI failure at production route exposure in two jobs;
- Firebase Preview failure;
- Guardian Diagnostics failure;
- v60 CI failure.

Do not claim launch certification, production parity, route continuity, deployed SHA parity, or live-domain readiness from this packet alone.

## Next receipt required

The next valid receipt should prove the blockers are removed or intentionally scoped out by policy:

1. Production route exposure passes in URAI Spatial CI.
2. Static release contract passes in Release Readiness.
3. Patch Check passes.
4. URAI Guardian passes so install, typecheck, tests, build, and release gate can run.
5. URAI Production Verify completes with conclusion `success` and attaches verification logs/artifacts.

Only after those receipts exist should production deployment or live-domain parity be certified.
