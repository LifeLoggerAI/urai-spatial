# URAI Repository Ownership

Status: active source-of-truth contract  
Date: 2026-07-06

## Canonical product authority

| Responsibility | Repository | Authority |
| --- | --- | --- |
| Public URAI product, route chain, spatial browser runtime, Firebase web deployment | `LifeLoggerAI/urai-spatial` | Canonical |
| Product root | `LifeLoggerAI/urai-spatial/urai-tier1` | Canonical deployed package |
| Public branch | `LifeLoggerAI/urai-spatial:main` | Canonical release branch |
| Public domain | `https://urai.app` | Intended canonical domain; exact deployed SHA must be receipted |
| Firebase project | `urai-4dc1d` | Intended canonical project; deployment receipt required |

The canonical Home source chain is:

```text
urai-tier1/src/app/page.tsx
  -> urai-tier1/src/app/FinalHomeThreshold.tsx
  -> urai-tier1/src/app/HomeSpatialWorldFinal.tsx
```

Root `src/**` in `urai-spatial` is a deterministic computation plane. It is not the browser entrypoint and is not production-integrated merely because it compiles.

## Supporting system ownership

| System | Repository | Owned responsibility | Current production claim boundary |
| --- | --- | --- | --- |
| Studio and control-plane workflows | `LifeLoggerAI/urai-studio` | Studio UX, command/control integration, Firebase Functions owned by Studio | Integration must be proven through versioned contracts and live receipts |
| Asset generation | `LifeLoggerAI/asset-factory` | Canonical V1-V5 manifests, generation planning, provider receipts, provenance | Files or green offline checks do not prove provider-backed promotion |
| Jobs and orchestration | `LifeLoggerAI/urai-jobs` | Asynchronous jobs, retries, queues, worker lifecycle | Production URL, authentication, idempotency, DLQ and live receipt required |
| Privacy and data rights | `LifeLoggerAI/urai-privacy` | Consent, export, deletion, retention and privacy operations | Public privacy claims must map to implemented product and storage controls |
| Analytics | `LifeLoggerAI/urai-analytics` | Governed events, metrics definitions, freshness and reporting | No investor/public metric is actual without source lineage and receipt |
| Communications | `LifeLoggerAI/urai-communications` | Notification and communication contracts | No outbound action may be assumed active without provider and delivery receipt |
| Content | `LifeLoggerAI/urai-content` | Approved content records and content delivery contracts | Must not silently override route-local or legal-approved copy |
| Administration | `LifeLoggerAI/urai-admin` | Operational administration, evidence, monitoring and controlled interventions | Privileged operations require authentication, audit and rollback boundaries |
| Staging | `LifeLoggerAI/urai-staging` | Pre-production integration environment | Staging evidence is not production evidence |
| Marketing | `LifeLoggerAI/urai-marketing` | Public marketing surfaces and campaign content | Claims must be approved by the canonical claim/evidence register |
| Investors | `LifeLoggerAI/urai-investors` | Investor thesis portal and controlled diligence workflows | Not approved for real confidential data-room use until its security gates close |
| B2B | `LifeLoggerAI/B2Bportal` | Business-facing portal and future organization workflows | Must use versioned contracts; repository existence does not prove product availability |
| Storytime | `LifeLoggerAI/urai-storytime` | Narrative/story experiences | Narrative surfaces must distinguish current product from research/roadmap |
| Foundation | `LifeLoggerAI/urai-foundation` | Foundation/research/advisor materials | Not public product authority |
| Corporate public surface | `LifeLoggerAI/urai-labs-llc` | Corporate/public information | Must use the current approved entity and IP ownership language |

## Legacy and migration repositories

The following repositories are reference, migration or rollback sources only unless a specific migration decision and exact release receipt supersede this document:

- `LifeLoggerAI/UrAi`
- `LifeLoggerAI/UrAi-Dev`
- `LifeLoggerAI/UrAiProd`

They must not:

- deploy the canonical `urai.app` product;
- redefine the canonical route owners;
- publish competing release/version claims;
- become sources for current provider, privacy, user, financial or legal claims;
- receive production changes without a recorded migration or rollback purpose.

Archiving or deleting these repositories requires explicit owner approval and an evidence-preservation decision.

## Asset-version authority

The canonical asset contract is owned by `LifeLoggerAI/asset-factory` and consumed by `LifeLoggerAI/urai-spatial`:

| Version | Capability pack | Expected outputs |
| --- | --- | ---: |
| V1 | Genesis Public Route World | 53 |
| V2 | Living System States | 80 |
| V3 | Relationship, Shadow and Pattern World | 14 |
| V4 | WebXR, AR and VR Pathway | 39 |
| V5 | Mirror of Becoming and Autonomous Legacy | 27 |

Older documents that call the 39-output XR pack “V3” are obsolete. Provider-backed completion still requires exact paid-provider receipts, checksums, provenance, derivatives, runtime wiring and visual evidence.

## Legal and IP entity boundary

The intended IP-holding entity is **URAI IP Holdings LLC**. Older Drive or repository materials naming UrAi Labs, URAI Labs LLC or another entity are historical source material, not current ownership proof. Public or investor-facing IP ownership claims require signed assignment/entity records and qualified legal review.

## Change-control rule

A repository ownership change is valid only when the same reviewed change:

1. updates this file;
2. updates the producing and consuming repository contracts;
3. migrates tests and deployment authority;
4. records rollback ownership;
5. updates the completion ledger;
6. includes an exact commit and release receipt.
