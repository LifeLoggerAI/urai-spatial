# AAA Launch Proof Runner

Script: `scripts/aaa-launch-proof.mjs`

This runner is verification-only. It creates a timestamped proof receipt under:

```text
$HOME/urai-final-receipts/aaa-launch-proof-<commit>-<timestamp>/
```

Production deployment is intentionally unavailable from this script. Deploy `urai.app` only through `.github/workflows/spatial-live-deploy.yml` using the protected `production` environment, exact release and rollback SHAs, and `DEPLOY_URAI_APP`.

## Standard proof pass

Run from the repository root:

```bash
node scripts/aaa-launch-proof.mjs
```

This records:

- git branch, commit, and working-tree state;
- `pnpm install --frozen-lockfile`;
- `pnpm typecheck`;
- `pnpm run --if-present test`;
- `pnpm build:static`;
- live route and fingerprint checks for `https://urai.app`;
- the asset receipt summary from `docs/final-asset-receipt.md`;
- `final-report.md`, `summary.json`, and route-matrix evidence.

## Screenshot proof

```bash
node scripts/aaa-launch-proof.mjs --screenshots
```

Screenshots are attempted at desktop and mobile widths for:

```text
/home
/ground
/life-map
/focus?memoryId=quiet-reset&manifestId=launch&node=quiet-reset
/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset
/mirror
/passport
/status
/privacy-controls
/location-map
/spatial/ar-vr
```

If Playwright or a browser is unavailable, the receipt records the block instead of silently claiming proof.

## Useful skip flags

```bash
--skip-install
--skip-typecheck
--skip-test
--skip-build
--skip-assets
```

Use skip flags only when the same exact commit already has trusted evidence for the omitted step.

## Custom live base URL

```bash
node scripts/aaa-launch-proof.mjs --base=https://urai.app
```

## Production release

Use the canonical workflow:

```text
.github/workflows/spatial-live-deploy.yml
```

Required manual inputs:

- exact 40-character `release_sha`;
- exact 40-character proven `rollback_sha`;
- confirmation `DEPLOY_URAI_APP`.

The proof runner rejects `--deploy`.

## Honest proof boundaries

The runner does not prove:

- physical Quest hardware certification;
- bespoke final art while assets remain fallback or placeholder;
- production backend, provider, authentication, persistence, or destructive deletion behavior without corresponding live evidence.
