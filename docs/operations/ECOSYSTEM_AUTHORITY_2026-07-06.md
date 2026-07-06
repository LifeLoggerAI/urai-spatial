# URAI Ecosystem Authority

Date: 2026-07-06

## Canonical product authority

- Public application: `LifeLoggerAI/urai-spatial`
- Runtime root: `urai-tier1`
- Branch: `main`
- Public domain: `https://urai.app`
- Firebase project target: `urai-4dc1d`
- Asset pipeline: `LifeLoggerAI/asset-factory`
- Intended IP-holding entity: `URAI IP Holdings LLC`

Source presence is not deployment proof. Exact tested, deployed, and rollback SHAs remain release-receipt fields.

## Repository ownership

| Repository | Authority | Current disposition |
| --- | --- | --- |
| `urai-spatial` | Canonical public spatial product and browser/XR runtime | Active canonical |
| `asset-factory` | Canonical asset generation, receipts, manifests, optimization and promotion | Active canonical dependency |
| `urai-studio` | Studio command/integration plane | Active; production service wiring unverified |
| `urai-staging` | Release train, environment registry and staging evidence | Active; complete environment authority pending |
| `urai-jobs` | Durable jobs/orchestration | Active; deployed queue/DLQ evidence pending |
| `urai-privacy` | Consent, export, deletion, retention and privacy operations | Active; executable production proof pending |
| `urai-analytics` | Privacy-classified product and operational analytics | Active; production dashboards/retention unverified |
| `urai-admin` | Administrative approvals, flags, provider and incident controls | Active; deployed control plane unverified |
| `urai-content` | Shared content and schema contracts | Active; ecosystem compatibility receipt pending |
| `urai-communications` | Call intelligence and governed communication pilot | Active adjacent service; broad production blocked |
| `urai-marketing` | Marketing/public acquisition surfaces | Active; claims and provider deployment must follow product receipts |
| `urai-storytime` | Narrative/story media | Research/product lane; not launch-critical |
| `urai-foundation` | Foundation/research/nonprofit materials | Stakeholder lane; not runtime authority |
| `urai-investors` | Investor materials | Stakeholder lane; not runtime authority |
| `B2Bportal` | Enterprise/B2B surface | Future/enterprise lane |
| `urai-labs-llc` | Historical business-architecture repository | Entity naming requires counsel reconciliation |
| `UrAi` | Legacy/reference application | Must not deploy over canonical production |
| `UrAi-Dev` | Legacy/development reference | Must not deploy over canonical production |
| `UrAiProd` | Legacy/rollback reference | Must not compete with `urai-spatial` authority |

## Version authority

The evidence-backed version ladder is:

- **V1 — Spatial Foundation:** route owners and V1 asset source handoff exist; current deployment, route parity, browser, visual and rollback proof remain incomplete.
- **V2 — Living World:** canonical target requires 80 provider-backed assets. Current handoff reports `0 ready / 80 missing`.
- **V3 — Relationships and Patterns:** canonical target requires 39 provider-backed, privacy-reviewed assets. Current handoff reports `0 ready / 39 missing`.
- **V4 — Spatial Computing:** WebXR/Quest source hardening exists; browser and physical-device certification remain blocked.
- **V5 — Mirror of Becoming:** identity, provenance, legacy and protected-presence capabilities remain implementation/privacy gated.
- **V50 — Canonical deterministic baseline:** PR #415 is the active certification candidate. It is not certified until its exact-head workflow artifact passes.
- **V100 — Production-integrated operating baseline:** requires certified V50, distributed convergence, deployed cross-service contracts, privacy/jobs/monitoring and production receipts.
- **V150 — Shared spatial/provider baseline:** requires V100 plus provider-backed V2/V3 promotion and browser/device-certified spatial computing.
- **V200 — Audited global production platform:** requires global accessibility, localization, privacy, security, cost, provider, monitoring, incident and rollback certification.

V50/V100/V150/V200 are capability milestones, not marketing numbers. They become true only when their required receipts exist.

## Status vocabulary

Every ledger item uses one of:

- `VERIFIED LIVE`
- `VERIFIED IN REPOSITORY`
- `IMPLEMENTED BUT NOT DEPLOYED`
- `PARTIALLY IMPLEMENTED`
- `BLOCKED`
- `ROADMAP`
- `REJECTED OR OBSOLETE`
