# URAI Public Claims Authority

Status: operational communications authority for current public product, demo, partner, event, media, and investor-facing language.

This document assigns accountable roles and recheck conditions. It is not legal advice and does not replace counsel review, repository evidence, or exact deployment receipts.

## Source priority

Use the strictest current statement from:

1. `STATUS.md`
2. `EVIDENCE.md`
3. `docs/V1_V100_VERIFICATION_LEDGER.md`
4. `urai-tier1/src/data/launchTruth.ts`
5. Exact tested-SHA, deployed-SHA, rollback, live-smoke, provider, and device receipts
6. `docs/founder-readiness/CLAIMS_AND_LEGAL.md`

A route, file, feature flag, provider seam, version label, or successful local build is not production certification.

## Approval roles

| Claim class | Operational owner | Required reviewer | Recheck trigger |
| --- | --- | --- | --- |
| Product one-liner and demo explanation | Founder / claims owner assigned through issue `#497` | Repository product owner | Any product-path, Status, deployment, or positioning change |
| Current implementation and production status | Release-control owner assigned through issue `#461` | Repository owner | Every tested or deployed SHA; receipt or route-parity change |
| Sample-data disclosure | Demo-kit owner assigned through issue `#495` | Claims owner | Any demo dataset, route, capture, or analytics change |
| Privacy, persistence, deletion, export, consent, or tenant-isolation statement | Privacy/data-flow owner | Security/privacy reviewer and counsel when formal | Any data-flow, auth, storage, retention, vendor, or policy change |
| Provider, asset, XR, wearable, biometric, or device statement | Capability owner | Release-control owner plus provider/device evidence owner | Provider activation, manifest promotion, browser/device run, or fallback change |
| Medical, research, health, veteran, caregiver, or accessibility-outcome statement | Product owner | Qualified legal/clinical/research reviewer as applicable | Use-case, study, evidence, population, consent, or regulatory change |
| Entity, founder, ownership, trademark, patent, copyright, or chain-of-title statement | Authorized corporate officer | Counsel | Entity, filing, assignment, contributor, license, or ownership change |
| Financing, valuation, offering, return, market-size, or investor-solicitation statement | Authorized corporate officer | Securities counsel | Financing strategy, terms, audience, jurisdiction, or offering change |

Role ownership must be recorded in the relevant GitHub issue or private corporate system before approval. Do not invent a person's authorization from repository access alone.

## Allowed current public status

> URAI is building a spatial operating system for memory, identity, reflection, focus, and personal direction. The repository contains a substantial fallback/demo spatial web experience that can be demonstrated with synthetic sample data. Production certification, exact deployed-SHA proof, authenticated private persistence, provider activation, and physical-device certification remain separately evidence-gated.

## Required demo disclosure

> This demo uses synthetic sample data. Some capabilities are represented through fallback-safe behavior and remain production-certification pending.

## Required investor-demo disclosure

> The demonstration shows the current spatial product experience and source-implemented journey. Provider activation, authenticated persistence, physical-device certification, and production deployment claims are separately receipt-gated.

## Prohibited without new evidence and review

- V1 through V100 described as complete or production-certified.
- Active provider-backed V2/V3 assets without promoted manifests and receipts.
- Physical Quest, WebXR, wearable, biometric, or other device certification without device evidence.
- Persistent private memory, user/tenant isolation, export, deletion, or revocation described as live without end-to-end proof.
- Diagnosis, treatment, therapy replacement, crisis response, clinical outcome, lie detection, mind reading, surveillance, or psychological certainty.
- Autonomous real-world action that the current system does not execute and verify with human approval.
- Guaranteed investment return, market size, valuation, patent scope, regulatory result, or commercial outcome.
- Entity, founder, IP, or ownership statements that have not been reconciled against authorized corporate records.

## Change-control rule

A public claim may expand only when all of the following are recorded:

1. Exact wording.
2. Source of truth.
3. Evidence or receipt identifier.
4. Operational owner.
5. Required reviewer approval.
6. Approval date.
7. Expiration or recheck condition.

When evidence regresses, a deployment changes, a provider is disabled, a receipt expires, or a review is withdrawn, the public claim must be reduced immediately.

## Approval record

| Claim or asset | Exact approved wording | Source/receipt | Operational owner | Reviewer | Date | Recheck condition |
| --- | --- | --- | --- | --- | --- | --- |
| Current public status | Use the “Allowed current public status” paragraph above | `STATUS.md`, `EVIDENCE.md`, `launchTruth.ts` | Claims owner | Release-control owner | Pending named-role acknowledgment | Every tested/deployed SHA or Status change |
| Public demo disclosure | Use the required demo disclosure above | `CLAIMS_AND_LEGAL.md` | Demo-kit owner | Claims owner | Pending named-role acknowledgment | Any demo route/data/capture change |
| Investor-demo disclosure | Use the required investor disclosure above | `CLAIMS_AND_LEGAL.md` | Investor-materials owner | Claims owner; counsel before formal solicitation | Pending named-role acknowledgment | Any financing, evidence, or product-state change |

“Pending named-role acknowledgment” means the wording is repository-enforced but has not been represented as legal, securities, clinical, or corporate approval.
