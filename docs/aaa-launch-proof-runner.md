# AAA Launch Proof Runner

Script: `scripts/aaa-launch-proof.mjs`

This runner is verification-only. It requires a clean Git working tree and a resolvable 40-character commit SHA before any proof step runs. It creates a receipt under:

```text
$HOME/urai-final-receipts/aaa-launch-proof-<loop>-<short-sha>-<timestamp>/
```

Set `URAI_RECEIPT_ROOT` to use a different receipt root. Set `URAI_PROOF_SOURCE_SHA` when an external caller needs the checked-out commit to match an explicit SHA. Pull-request runs do not infer the expected head from GitHub's merge-ref `GITHUB_SHA`; the checked-out clean commit remains recorded in every receipt.

Production deployment is intentionally unavailable. `.github/workflows/spatial-live-deploy.yml` is verification-only and records **NO-GO**; it has no protected production environment, deploy inputs, provider credentials, or mutation step.

## Standard proof pass

Run from the repository root:

```bash
node scripts/aaa-launch-proof.mjs
```

The standard pass executes:

- frozen installation;
- asset checks when `scripts/check-spatial-assets.mjs` exists;
- typecheck;
- unit tests;
- build;
- production-authority audit;
- production-route exposure check;
- public-copy policy check.

The receipt records:

- exact source SHA;
- optional expected source SHA;
- clean working-tree state;
- source-identity verification result;
- every command and exit status;
- production deployment attempted: `false`;
- the sole production authority.

A dirty tree, unresolvable Git commit, or explicit SHA mismatch fails before verification begins.

## Screenshot proof

```bash
LOOP_NAME=manual-visual-proof node scripts/aaa-launch-proof.mjs --screenshots --base=https://urai.app
```

The screenshot option runs `scripts/live-visual-audit.mjs`. Its current matrix captures desktop and mobile evidence for 14 route configurations, producing 28 PNGs under:

```text
<receipt>/live-visual-audit/screenshots/
```

The visual audit also records route markers, stale-content checks, links, interaction checks, HTTP status, final URLs, and browser errors. A missing browser or failed route is a failed proof step; it is never silently counted as success.

## Useful skip flags

```text
--skip-install
--skip-typecheck
--skip-test
--skip-build
--skip-assets
```

Use a skip flag only when the same exact source SHA already has trusted evidence for the omitted step. The receipt records the commands that actually ran, so a partial proof cannot masquerade as a full one.

## Fast live-surface check

For a commit that already has trusted install, asset, typecheck, test, and build receipts:

```bash
LOOP_NAME=live-surface-check node scripts/aaa-launch-proof.mjs \
  --base=https://urai.app \
  --screenshots \
  --skip-install \
  --skip-assets \
  --skip-typecheck \
  --skip-test \
  --skip-build
```

## Production release

There is no active repository production release path. The canonical workflow and all preview workflows are checks-only. The proof runner rejects `--deploy` with a nonzero exit code.

Restoring authority requires a separately reviewed change after provider-side WIF/IAM, historical-key revocation, negative-auth, audit-log, protected settings/read-back, and eligible exact-head approval are proven.

## Honest proof boundaries

The runner does not prove:

- physical Quest hardware certification;
- bespoke final art that is absent from the repository;
- production backend, provider, authentication, persistence, or destructive deletion behavior without corresponding live evidence;
- production deployment merely because source and route proof pass;
- final visual taste without the recorded human review step.
