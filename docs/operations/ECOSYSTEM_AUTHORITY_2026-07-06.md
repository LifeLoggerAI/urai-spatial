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
| `asset-factory` | Canonical asset labels, manifests, generation, receipts, optimization and promotion | Active canonical dependency |
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
| `urai-foundation` | Public-interest standards, governance and accountability lane | Active stakeholder dependency; not runtime authority |
| `urai-investors` | Investor materials | Stakeholder lane; not runtime authority |
| `B2Bportal` | Enterprise/B2B surface | Future/enterprise lane |
| `urai-labs-llc` | Historical business-architecture repository | Entity naming requires counsel reconciliation |
| `UrAi` | Legacy/reference application | Must not deploy over canonical production |
| `UrAi-Dev` | Legacy/development reference | Must not deploy over canonical production |
| `UrAiProd` | Legacy/rollback reference | Must not compete with `urai-spatial` authority |

## Version authority

Asset Factory's executable canonical contract owns V1-V5 labels and counts:

- **V1 — Genesis Public Route World:** 53 outputs. Source handoff exists; promotion/live proof remains incomplete.
- **V2 — Living System States:** 80 outputs. No promoted 80/80 provider receipt is recorded.
- **V3 — Relationship, Shadow and Pattern World:** 14 outputs. No promoted 14/14 provider receipt is recorded.
- **V4 — WebXR, AR and VR Pathway:** 39 outputs. WebXR source exists; provider, browser and physical-device certification remain blocked.
- **V5 — Mirror of Becoming and Autonomous Legacy:** 27 outputs. Implementation, provenance, privacy and provider proof remain blocked.

Any older document or handoff that labels the 39-output XR pack as V3 is `REJECTED OR OBSOLETE` and must not drive provider execution or promotion.

Capability milestones:

- **V50 — Canonical deterministic baseline:** PR #415 is the active certification candidate. It is not certified until its exact-head workflow artifact passes.
- **V100 — Production-integrated operating baseline:** requires certified V50, distributed convergence, deployed cross-service contracts, privacy/jobs/monitoring and production receipts.
- **V150 — Shared spatial/provider baseline:** requires V100, promoted V2-V5 assets as applicable, and browser/device-certified spatial computing.
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

## Canonical ledger ownership

- `docs/operations/ECOSYSTEM_COMPLETION_LEDGER_2026-07-06.md` is the single cross-repository completion ledger.
- `docs/operations/RECEIPT_INDEX_2026-07-06.md` is the single cross-repository receipt index.
- Route-ownership enforcement, public status truth, and release-machine data remain owned by implementation files and workflows rather than duplicate ledgers.

## Execution receipts

- `R-SPAT-CI-001` — PR #418 merged to `main` as `f55ad9f08a80d502c85538300907dcb7f1566212`. It keys AAA Final Proof and Spatial Lock concurrency to the pull-request head branch, preventing unrelated PRs from cancelling one another. This is VERIFIED IN REPOSITORY; downstream exact-head workflow completion remains pending.
