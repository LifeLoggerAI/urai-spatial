# URAI Spatial valid receipt packet

Generated: 2026-07-07
Repository: `LifeLoggerAI/urai-spatial`
Branch: `launch/verification-pr-receipt-20260707`
PR: #460 `Launch verification PR receipt path`
PR head SHA: `650f19834a66a33f920ce77762e187b69f4f0847`
Base branch: `main`
Base SHA observed by PR metadata: `7876116b06241553ee87513c2c6b1977baa4f94b`
Merge test SHA observed by PR metadata: `51d931ce5853e9bf1b9dffbfaa6c258278cec46f`

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

## Valid observed receipts

### PR metadata receipt

- PR #460 exists and is open.
- PR #460 is draft.
- PR #460 is mergeable at the time observed.
- PR head SHA: `650f19834a66a33f920ce77762e187b69f4f0847`.
- PR body states the gate: do not merge until exact-head verification receipts are attached, including workflow run id, typecheck result, build result, route smoke artifact, and deployment evidence if deployed.

### Workflow receipts tied to PR head `650f19834a66a33f920ce77762e187b69f4f0847`

Observed workflow runs:

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

## Artifact receipts

The following artifact receipts were observed and are valid evidence for their individual scopes:

| Run ID | Artifact ID | Artifact name | Digest | Scope |
|---:|---:|---|---|---|
| 28845011678 | 8129220571 | `xr-static-gate-diagnostics` | `sha256:bbfba0f45fef24c2040b03f826c93a2f0b9a013977ccd70b3de89fe85fd5e33e` | XR static gate diagnostics |
| 28845011724 | 8129232878 | `spatial-e2e-source` | `sha256:351153d06d4a44211b3ae24f8700987d6e3b60569a824e7db747264e673e5ddd` | exported E2E source evidence |
| 28845011683 | 8129239421 | `spatial-missing-resource-diagnostics` | `sha256:8d52ab3cc3a69b3808dc78d6192d97353809010e6a4f4fb5d22f377d76dfaa4c` | missing-resource diagnostics |

## Job-step receipts

### URAI Production Verify run `28845011652`

Observed job: `verify`, job id `85546803612`.

Completed successfully before observation cutoff:

- Set up job;
- checkout;
- setup Node;
- enable pnpm;
- install dependencies;
- install Playwright runtime.

Still in progress when observed:

- Verify.

Pending when observed:

- upload production verification log;
- preserve verification result.

This is not yet a passing production verification receipt.

### URAI Spatial Verify run `28845011734`

Observed job: `Verify URAI Spatial`, job id `85546803893`.

- Setup, checkout, Corepack, and Node setup succeeded.
- `URAI Guardian` failed.
- install dependencies, public copy check, Firestore boundaries, typecheck, unit tests, build, and release gate were skipped after the guard failure.

This is a valid blocker receipt, not a production pass.

### Patch Check run `28845011699`

Observed job: `pnpm patch:check`, job id `85546803858`.

- setup, checkout, pnpm setup, Node setup, Corepack, and install dependencies succeeded.
- `Run patch checks` failed.

This is a valid blocker receipt.

## Current certification statement

As of this receipt packet, URAI Spatial PR #460 is partially evidenced but not production-certified.

Valid positive receipts exist for:

- XR static gate diagnostics;
- privacy adoption checks;
- spatial E2E source export;
- missing-resource diagnostics;
- dependency installation and Playwright runtime setup inside the in-progress production verify run.

Valid blocker receipts exist for:

- URAI Spatial Verify failure at Guardian;
- Patch Check failure;
- Release Readiness failure;
- Firebase Preview failure;
- Guardian Diagnostics failure;
- v60 CI failure;
- URAI Spatial CI failure.

Do not claim launch certification, production parity, route continuity, deployed SHA parity, or live-domain readiness from this packet alone.

## Next receipt required

The next valid receipt should be a completed `URAI Production Verify` run with conclusion `success`, plus attached verification log/artifact, followed by route smoke/live deployment receipts if production deployment is claimed.
