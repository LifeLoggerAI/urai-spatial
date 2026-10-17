# URAI Ecosystem Dependency Graph

## Scope

This is the Spatial V9 source dependency view. It does not replace the complete URAI IP Holdings estate graph, establish legal ownership, or certify live integrations and deployments.

## Core graph

| Registry ID | Source or dependency | Relationship to Spatial | Acceptance |
| --- | --- | --- | --- |
| `urai-spatial` | `LifeLoggerAI/urai-spatial` | Spatial memory interface and V1-V10 product evolution source | Source presence does not establish release acceptance. |
| `deferred-asset-lane` | `LifeLoggerAI/asset-factory` (`asset-factory`) | Asset generation and provenance dependency | Repository discovered; live provider-to-consumer integration acceptance not assessed here. |
| `deferred-studio-handoff` | `LifeLoggerAI/urai-studio` (`urai-studio`) | Creative production and studio handoff dependency | Repository discovered; live handoff acceptance not assessed here. |
| `firebase-hosting` | Infrastructure configuration and hosting dependency | Deployment and runtime hosting target | Production deployment and runtime require their own exact-artifact receipts. |

The existing asset and studio registry IDs remain stable for consumers. Their historical `deferred` names do not mean the source repositories are absent. A source repository, provider configuration, or donor PR alone does not prove a working live handoff.

GitHub Actions records source checks and evidence artifacts. Each receipt applies to its exact tested SHA and evidence scope; it does not automatically authorize a successor release.

## Risk classes

- blocker: prevents an applicable release requirement from being satisfied.
- degraded: an evidence or E2E lane is unhealthy; release impact requires assessment.
- asset-pending: required visual assets have not been accepted in their runtime consumer.
- evidence-missing: the required proof artifact is absent.
- external-dependency: an adjacent system or provider requires separate authority and evidence.
- acceptance-unverified: source presence is complete, but release acceptance has not been assessed.

## Release boundary

`scripts/ecosystem/collect-evidence.mjs` records file presence. `scripts/ecosystem/report.mjs` reports that limited inventory as `SOURCE_FILE_PRESENCE_ONLY`, with `releaseAcceptance: NOT_ASSESSED` and `shipAuthorized: false`, including when all checked files are present.

Shipping requires the existing independent release governance and applicable runtime, visual, privacy, security, accessibility, device, provider, deployment and recovery evidence bound to an exact release SHA. This graph and registry cannot provide that authority.

V9 must report ecosystem state without pretending adjacent systems are local code or live provider integrations.
