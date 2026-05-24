# URAI Spatial Milestone Board

## M0 Source of Truth + Audit Lock

- Goal: lock repo truth, canonical boundary, and release candidate control model
- Issues: [#260](https://github.com/LifeLoggerAI/urai-spatial/issues/260)
- Owner role: Release Manager
- Dependencies: none
- Entry criteria: repo audit posture exists
- Exit criteria: canonical repo boundary accepted and one release candidate SHA control process defined
- Risks: mixed authority, mixed-SHA evidence
- Target order: 1
- Blocker level: critical
- Go/No-Go relevance: direct

## M1 Build Stability + Environment Baseline

- Goal: prove release gate can pass on locked SHA
- Issues: [#256](https://github.com/LifeLoggerAI/urai-spatial/issues/256)
- Owner role: Release Engineer
- Dependencies: M0
- Entry criteria: locked SHA and approved runner available
- Exit criteria: passing `pnpm live:check` artifact exists for locked SHA
- Risks: hidden build, runtime, or E2E failures
- Target order: 2
- Blocker level: critical
- Go/No-Go relevance: direct

## M2 Auth/Data/Security Baseline

- Goal: confirm secrets, workflow prerequisites, and backend deployment scope are safe and understood
- Issues:
  - [#263](https://github.com/LifeLoggerAI/urai-spatial/issues/263)
  - [#264](https://github.com/LifeLoggerAI/urai-spatial/issues/264)
  - [#265](https://github.com/LifeLoggerAI/urai-spatial/issues/265)
- Owner role: DevOps Engineer
- Dependencies: M0
- Entry criteria: canonical release posture locked
- Exit criteria: secrets posture reviewed, workflow prerequisites confirmed, functions scope resolved
- Risks: missing credentials, leaked secrets, ambiguous deploy scope
- Target order: 3
- Blocker level: high
- Go/No-Go relevance: direct

## M3 Core Product Beta

- Goal: confirm documented release surface matches validated release surface
- Issues: [#261](https://github.com/LifeLoggerAI/urai-spatial/issues/261)
- Owner role: QA Lead
- Dependencies: M1
- Entry criteria: gate evidence available
- Exit criteria: route/API coverage matrix completed with gaps logged
- Risks: release surface overstatement
- Target order: 4
- Blocker level: high
- Go/No-Go relevance: indirect but important

## M4 Admin/Operations

- Goal: ensure operational truth, ledger discipline, and ownership controls exist
- Issues: [#259](https://github.com/LifeLoggerAI/urai-spatial/issues/259)
- Owner role: Release Manager
- Dependencies: M1, M5
- Entry criteria: gate, deploy, and smoke evidence exist or are pending final review
- Exit criteria: ledger matches full evidence chain and owner roles are confirmed
- Risks: false live status, weak audit trail
- Target order: 6
- Blocker level: critical
- Go/No-Go relevance: direct

## M5 Deploy + Publish Readiness

- Goal: execute controlled deploy and live smoke on approved target
- Issues:
  - [#255](https://github.com/LifeLoggerAI/urai-spatial/issues/255)
  - [#257](https://github.com/LifeLoggerAI/urai-spatial/issues/257)
  - [#258](https://github.com/LifeLoggerAI/urai-spatial/issues/258)
- Owner role: Release Engineer
- Dependencies: M0, M1, M2
- Entry criteria: locked SHA, passing gate, approved target, approved credentials path
- Exit criteria: deploy and smoke artifacts exist for locked SHA on approved URL
- Risks: wrong target, wrong scope, wrong URL, failed smoke
- Target order: 5
- Blocker level: critical
- Go/No-Go relevance: direct

## M6 Public Launch Polish

- Goal: prevent public overclaims and align messaging with actual validated posture
- Issues: [#262](https://github.com/LifeLoggerAI/urai-spatial/issues/262)
- Owner role: Product Owner
- Dependencies: M3
- Entry criteria: release surface and launch messaging available for review
- Exit criteria: no unsupported provider claims remain
- Risks: misrepresentation and trust damage
- Target order: 7
- Blocker level: medium
- Go/No-Go relevance: direct

## M7 Post-Launch Cleanup

- Goal: track cleanup and follow-up after a successful verified release attempt
- Issues: follow-up issues only; evidence not yet created
- Owner role: TPM
- Dependencies: M4, M6
- Entry criteria: verified live release exists
- Exit criteria: follow-up backlog filed and stale release artifacts/process gaps reviewed
- Risks: operational drift after launch
- Target order: 8
- Blocker level: low
- Go/No-Go relevance: none until verified launch exists
