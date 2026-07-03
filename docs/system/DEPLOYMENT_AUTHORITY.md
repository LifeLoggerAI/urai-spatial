# URAI Deployment Authority

Last verified: 2026-07-03

## Sole canonical deployment source

* Repository: `LifeLoggerAI/urai-spatial`
* Application directory: `urai-tier1`
* Default branch: `main`
* Public domain: `https://urai.app`
* Referenced Firebase project: `urai-4dc1d`

The canonical public application is `LifeLoggerAI/urai-spatial/urai-tier1` at `https://urai.app`.

A canonical production deployment must be built from an exact `urai-spatial/main` commit after all required checks pass.

## Legacy authority removal

`LifeLoggerAI/UrAi` previously deployed to the shared Firebase live channel on each push to `main`. PR #352 removed that automatic push trigger.

The remaining legacy deployment workflow:

* is manual only;
* requires the exact acknowledgement `DEPLOY_LEGACY_URAI`;
* must identify itself as legacy;
* must use concurrency cancellation;
* may be used only for an explicitly approved rollback or migration.

`LifeLoggerAI/UrAi-Dev` and `LifeLoggerAI/UrAiProd` have no approved authority to deploy `urai.app`.

Historical production identifiers, Firebase aliases, Hosting targets, project IDs, or deployment configuration found in those repositories are blockers requiring investigation. They do not grant deployment permission.

## Required pre-deployment evidence

A production deployment requires all of the following evidence:

1. Exact source commit from `LifeLoggerAI/urai-spatial/main`.
2. Current deployed version or the best available deployment-proof marker.
3. Approved rollback commit.
4. Tested rollback command.
5. Successful dependency installation.
6. Successful typecheck.
7. Successful automated tests.
8. Successful production build.
9. Successful privacy checks.
10. Successful release checks.
11. Successful security checks.
12. Confirmation that no legacy automatic workflow can overwrite the production target.
13. Confirmation of the approved Firebase project and Hosting target.
14. Deployment workflow receipt tied to the exact source commit.
15. Post-deployment smoke tests against `https://urai.app`.
16. Slash and non-slash route parity.
17. Preservation of Focus and Replay query parameters.
18. Rejection of legacy runtime fingerprints.
19. Truthful and current `/status` content.

## Deployment integrity requirements

A merged pull request does not prove that production was deployed.

A Firebase alias does not prove that the correct application was deployed.

A successful build does not prove that production was deployed.

An HTTP `200` response alone does not prove that the correct application or commit is live.

Production certification requires evidence connecting:

* the exact canonical source commit;
* the approved deployment workflow;
* the approved Firebase project and Hosting target;
* the resulting deployment receipt;
* and the verified behavior of `https://urai.app`.

## Current state

* The legacy automatic overwrite path in `LifeLoggerAI/UrAi` is eliminated.
* The canonical public source is `LifeLoggerAI/urai-spatial/urai-tier1`.
* The canonical deployment branch is `LifeLoggerAI/urai-spatial/main`.
* The current canonical source head inspected during this pass is `3054fe8afb442b7f96c750ca28329ad1100e0b85`.
* Production certification remains pending current-head workflow results, deployment receipt, rollback evidence, and custom-domain smoke verification.

Do not infer a successful production deployment from a merged pull request, Firebase alias, Hosting configuration, workflow dispatch, build result, or HTTP `200` response alone.
