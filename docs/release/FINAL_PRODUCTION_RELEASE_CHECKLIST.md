# URAI Spatial Final Production Release Checklist

## Current release philosophy

Production readiness is separated into three layers:

1. Core product/runtime safety.
2. Asset activation.
3. V7 expansion.

V1-V6 core can be complete while final assets are pending. Final assets become active by landing files at the registered paths and passing the strict asset-ready gate.

## Required gates

### Core gates

```bash
pnpm lock:static
pnpm lock:build
pnpm verify:v1-v6:non-assets
```

### Asset gates

```bash
node scripts/check-v1-v6-asset-ready.mjs
node scripts/check-v1-v6-asset-ready.mjs --strict
```

### Live/deploy gates

```bash
pnpm live:check
pnpm smoke:live
```

## Before deploy

- [ ] Working tree clean.
- [ ] Latest main pulled.
- [ ] V1-V6 non-asset lock passes.
- [ ] Asset-ready switch report is generated.
- [ ] If launching with final assets, strict asset gate returns `V1_V6_ASSETS_ACTIVE`.
- [ ] If launching before final assets, release notes explicitly say final assets are pending.
- [ ] Replay/Tier-5 browser evidence is collected but not confused with core product safety.
- [ ] Exact candidate head has legitimate independent approval and successful Release Governance Guard.
- [ ] Candidate PR is merged without head drift and the merged PR number is recorded.
- [ ] Distinct proven rollback ancestor is recorded.
- [ ] Separate deployment authorization has been granted.
- [ ] Protected `production` environment and Google WIF/OIDC path are available; no long-lived Firebase credential is required.
- [ ] Live URL is set for smoke checks.

## Deploy command

```bash
gh workflow run spatial-governed-wif-deploy.yml -R LifeLoggerAI/urai-spatial --ref main \
  -f release_sha=<EXACT_APPROVED_MERGED_PR_HEAD_SHA> \
  -f rollback_sha=<DISTINCT_PROVEN_ROLLBACK_SHA> \
  -f pull_request=<MERGED_PR_NUMBER> \
  -f confirm=DEPLOY_URAI_APP
```

## After deploy

- [ ] Confirm governed workflow exact post-deploy smoke succeeded; if it failed, confirm automatic Hosting rollback restored the predeploy version.
- [ ] Smoke live URL independently.
- [ ] Save workflow evidence artifact.
- [ ] Confirm `/`, `/home`, `/life-map`, `/focus`, `/replay`, `/unwind`, `/spatial`, `/spatial/ar-vr`, `/privacy-controls`, `/status`.
- [ ] Confirm no privacy/fallback claim is broken.
- [ ] Tag release.

## Tagging

For core complete but asset pending:

```bash
git tag v1-v6-core-asset-ready
```

For final assets active:

```bash
git tag v1-v6-assets-active
```

For V7 start:

```bash
git checkout -b v7/scene-intelligence
```

## Release decision matrix

| State | Meaning | Action |
|---|---|---|
| Core green + asset switch ready | App/runtime complete, assets pending | Ship internal/proof or wait for assets |
| Strict assets active | V1-V6 final visual layer active | Full public launch candidate |
| Core gate failed | Runtime/product risk | Hold |
| E2E browser degraded only | Infra-sensitive evidence issue | Do not block deploy by itself |

## Final handoff statement

V1-V6 is considered ready for V7 only when the repo can prove:

```text
core gates pass
asset-ready switch is valid
asset activation path is explicit
V7 has no dependency on rewriting V1-V6 core
```
