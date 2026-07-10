# URAI release-control pass

Date: 2026-07-10
Verdict: NO-GO

## Production authority

- Repository: `LifeLoggerAI/urai-spatial`
- Runtime root: `urai-tier1`
- Branch: `main`
- Domain: `https://urai.app`
- Firebase project: `urai-4dc1d`
- Sole production workflow: `.github/workflows/spatial-live-deploy.yml`

Pushes and pull requests verify only. Production deployment requires manual `workflow_dispatch`, the protected `production` environment, exact release and rollback SHAs, service-account JSON authentication, exact-head validation, post-deploy smoke, screenshots, rollback instructions, and retained receipts.

## PR disposition

1. PR #433 is the merged route/source-lock baseline.
2. PR #467 is superseded by this current-main release-control pass because its exact-head release workflow failed.
3. PR #466 is not mergeable as a release candidate. Its branch is diverged and contains broad runtime, route, workflow, generated-asset, and placeholder-panel changes. Only canonical asset names/path requirements are retained as a checklist.
4. PR #457 is not mergeable as a release candidate. Only its fail-closed provider-manifest activation logic is extracted onto current main.
5. PR #437 remains draft reference until exact-head browser and physical-device proof exists.
6. PRs #397 and #398 remain closed architectural references.

## Canonical asset replacement checklist

No item may be marked ready unless the file exists at the exact case-sensitive canonical path, has an allowed format, positive byte size, SHA-256 receipt, provider renderer evidence where claimed, mobile/fallback behavior, and a manifest entry pointing to the same path.

- Home Entry Chamber GLB
- Portal Ring Master GLB
- Ground World Terrain GLB
- Life Map Galaxy Skybox HDR
- Focus Star Flight GLB
- Replay Memory Film GLB
- Passport/Status Spatial Room GLB
- Global Cinematic Material Pack
- route art replacement pack
- launch/social/status/trust preview kit

## Exact-head validation

```bash
pnpm install --frozen-lockfile
pnpm --dir urai-tier1 assets:validate
pnpm --dir urai-tier1 receipt:assets
pnpm --dir urai-tier1 typecheck
pnpm --dir urai-tier1 verify:aaa-world
pnpm --dir urai-tier1 xr:verify
pnpm live:check
```

## Deployment receipt requirements

A valid deployment receipt must identify repository, workflow run, exact release SHA, rollback SHA, Firebase project, hosting target, domain, credential mode, validation results, deployment output, deployed-SHA page evidence, slash/non-slash route parity, Focus and Replay query preservation, Privacy Controls and Status checks, legacy fingerprint scan, desktop/mobile screenshots, rollback command, and timestamps.

## Current blockers

- Exact-head checks are not green.
- Canonical production assets and provider receipts are incomplete.
- No current production deployment receipt exists for this control-pass SHA.
- Firebase production secrets and protected-environment approval are external to repository evidence.
- DNS ownership and custom-domain mapping require provider-console proof.
- Physical Quest/device certification is not available from GitHub evidence.
