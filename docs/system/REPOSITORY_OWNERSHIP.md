# URAI Repository Ownership

Last verified: 2026-07-03

## Canonical application

- Repository: `LifeLoggerAI/urai-spatial`
- Application: `urai-tier1`
- Domain: `https://urai.app`

`urai-spatial` owns the public Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Status, and spatial web/XR entry surfaces.

## Supporting repositories

- `asset-factory`: asset creation and reviewed promotion candidates.
- `urai-studio`: studio and orchestration.
- `urai-jobs`: queues and workers.
- `urai-admin`: authenticated operations.
- `urai-analytics`: consent-bound analytics.
- `urai-privacy`: privacy and consent surfaces.
- `urai-content`: content contracts.
- `urai-marketing`: marketing-only surface.
- `urai-communications`: communications pilot.
- `urai-storytime`: standalone story product.
- `urai-investors`: private investor surface.
- `B2Bportal`: private business portal.
- `urai-staging`: staging and integration only.
- `urai-labs-llc`: corporate site only.
- `urai-foundation`: public-interest standards site only.

## Legacy repositories

- `UrAi`: legacy runtime and migration reference. Automatic production deployment was removed by PR #352.
- `UrAi-Dev`: legacy development reference. Historical Firebase aliases remain blocked from use until corrected.
- `UrAiProd`: legacy operations and rollback reference.

Still-needed legacy work must be migrated through reviewed pull requests into the repository that owns the subsystem.

## Evidence rules

1. A repository name, old script, environment alias, or stale document is not production evidence.
2. Production certification requires an exact source commit, rollback target, passing required checks, deployment receipt, and custom-domain proof.
3. Missing evidence is `UNVERIFIED`, not passed.
4. Physical XR proof is separate from code verification.
5. Provider configuration in source is not proof that a provider is live.
