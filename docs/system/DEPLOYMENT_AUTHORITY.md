# URAI Deployment Authority

Last verified: 2026-07-03

## Sole canonical deployment source

- Repository: `LifeLoggerAI/urai-spatial`
- Application directory: `urai-tier1`
- Default branch: `main`
- Public domain: `https://urai.app`
- Referenced Firebase project: `urai-4dc1d`

A canonical production deployment must be built from an exact `urai-spatial/main` commit after required checks pass.

## Legacy authority removal

`LifeLoggerAI/UrAi` previously deployed to the shared Firebase live channel on each push to `main`. PR #352 removed the push trigger. The remaining legacy workflow:

- is manual only;
- requires the exact acknowledgement `DEPLOY_LEGACY_URAI`;
- identifies itself as legacy;
- uses concurrency cancellation;
- may be used only for an explicitly approved rollback or migration.

`UrAi-Dev` and `UrAiProd` have no approved authority to deploy `urai.app`. Historical production identifiers in their configuration are blockers, not permission.

## Required pre-deployment evidence

1. Exact source commit.
2. Current deployed version or the best available deploy-proof marker.
3. Rollback commit and rollback command.
4. Mandatory install, typecheck, test, build, privacy, release, and security checks.
5. Confirmation that no legacy automatic workflow can overwrite the target.
6. Approved Firebase project and Hosting target.
7. Deployment workflow receipt.
8. Post-deployment smoke against `https://urai.app`.
9. Slash and non-slash parity.
10. Focus and Replay query preservation.
11. Rejection of legacy runtime fingerprints.
12. Truthful `/status` content.

## Current state

- Legacy automatic overwrite path in `UrAi` is eliminated.
- Current canonical source head inspected during this pass: `3054fe8afb442b7f96c750ca28329ad1100e0b85`.
- Production certification remains pending current-head workflow results, deployment receipt, rollback evidence, and custom-domain smoke.

Do not infer a successful deployment from a merged pull request, a Firebase alias, or an HTTP 200 response alone.
