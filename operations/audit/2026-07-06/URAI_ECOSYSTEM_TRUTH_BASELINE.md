# URAI Ecosystem Truth Baseline — 2026-07-06

## Audit scope

This evidence baseline covers the accessible `LifeLoggerAI` GitHub repositories, current Google Drive architecture/version specifications, the canonical public application in `urai-spatial/urai-tier1`, and the canonical asset pipeline in `asset-factory`. Repository presence, source implementation, CI evidence, deployment evidence, provider evidence, and device evidence are classified separately.

No paid generation, secret rotation, destructive data action, or production deployment was performed while preparing this baseline.

## Canonical starting point

| Item | Evidence-backed state |
| --- | --- |
| Public app repository | `LifeLoggerAI/urai-spatial` |
| App runtime | `urai-tier1` |
| Canonical branch | `main` |
| Main SHA observed before this certification branch | `b0e29681956e2892f3c38d1cf5f99ffa8da1ec57` |
| README authority repair merged to main | `4e1606c9ab7cde42b942f62e1d65148df8fadceb` |
| Firebase Hosting source | `urai-tier1` |
| Firebase Functions source | `apps/functions` |
| Supported repository runtime | Node.js 22+ and `pnpm@10.0.0` |
| Intended Firebase project | `urai-4dc1d`; exact current deployment receipt is still required |
| Public domain | `https://urai.app` |
| Current deployed SHA | **Not established** |
| Rollback SHA | **Not established** |
| Current exact-head passing SHA | **Not established** |
| Current production asset-pack receipt | **Not established** |

## Executive truth

URAI has a substantial multi-repository product and operations foundation. The canonical public source includes the primary route chain, privacy-safe fallback behavior, provider seams, release gates, asset handoffs, WebXR/Quest preparation, and extensive evidence boundaries.

URAI is not yet one fully certified production system. Current source and current public deployment are not synchronized: the repository contains a dedicated Privacy Controls route and truthful certification-focused Status route, while the live domain currently exposes stale behavior for Privacy Controls, Status, and one Focus query form. The deployment SHA and rollback SHA are not recorded.

The public experience contains real implemented route surfaces, but implementation depth varies. Ground is an operating-world visual shell rather than proven first-person navigation. Life Map is an interactive public-safe constellation rather than a proven durable personal graph. Replay has a timed interactive state machine but is not yet a source-backed documentary generation pipeline. XR remains preview-grade until browser and physical-device evidence exists.

## Source-of-truth state

### Canonical product authority

The canonical public runtime is:

```text
LifeLoggerAI/urai-spatial
  -> urai-tier1
  -> main
  -> https://urai.app
```

The current Home source owner is:

```text
urai-tier1/src/app/page.tsx
  -> urai-tier1/src/app/FinalHomeThreshold.tsx
  -> urai-tier1/src/app/HomeSpatialWorldFinal.tsx
```

The root `src/**` deterministic simulation/kernel code is a separate computation plane. It is not the browser application entrypoint and must not be described as production-integrated merely because it compiles.

### Public deployment drift

Verified public drift requiring an exact-head release:

- `/privacy-controls/` currently resolves to the Home threshold instead of the dedicated Privacy Controls source page.
- `/focus/` and `/focus/?memoryId=quiet-reset` expose the current chamber, while `/focus?memoryId=quiet-reset` can expose a stale legacy shell.
- The live `/status/` surface is older than the current truthful source page.
- Exact current deployed SHA and rollback SHA remain unknown.

Current source already contains the dedicated Privacy Controls route, the truthful Status route, and a static Hosting configuration without a catch-all rewrite. These are deployment-drift findings, not missing-route findings.

### Route contract repair

The previous spatial system contract omitted most active product routes and conflated `/privacy` with `/privacy-controls`. Commit `89879013edeb80d27afd1468fbcf60d3e235f698` on this branch now:

- records both `/privacy` and `/privacy-controls`;
- includes the complete active route chain;
- includes `/spatial/life-map` and `/spatial/life-map-r3f`;
- derives smoke coverage from the canonical route registry;
- preserves the explicit `/spatial/ar-vr` preview route without certifying XR hardware.

This repair remains **implemented but not CI-certified** until the V50 workflow produces a passing artifact.

## Drive specification authority

The following Drive documents are populated and useful as architecture/version requirements as of July 6, 2026:

- `URAI System Architecture Spec v1`;
- `URAI OS Final Layer Spec`;
- `URAI Brain Map — Interactive OS Cockpit Spec (Live)`.

They establish intended authority and certifiable version definitions, but they are not runtime, deployment, provider, or device proof. Repository contracts and exact receipts remain the implementation authority.

## Asset Factory truth

### Current capabilities

- Manifest-driven image generation.
- Offline deterministic renderer for CI/mechanical proof.
- OpenAI Images provider adapter.
- Generic custom HTTPS provider adapter.
- Aspect-ratio normalization and PNG output.
- Per-output metadata sidecars.
- Validation, scoring, preview, seed, export, Spatial handoff, receipt, and version-selection stages.
- Fail-closed provider mode when credentials are absent.
- Billing-hard-limit receipt handling.

### Current limitations

- Offline proof art is not provider production art.
- A global maximum batch-dollar ceiling is not yet evidenced across every versioned entrypoint.
- Provider unit cost and total evidenced spend are not consistently recorded in immutable receipts.
- Provider-side asynchronous polling/cancellation is incomplete.
- Retry behavior can multiply cost.
- Version semantics have differed across legacy and canonical executable paths.
- No committed exact successful provider receipt was established for the full V2, V3, V4, or V5 canonical packs.
- No paid generation should run until version semantics and global cost controls pass.

### Versioned asset counts currently referenced

| Asset version | Current catalog posture | Receipt posture |
| --- | --- | --- |
| V1 | Genesis/public-route pack; source handoff reports 53 | Source-ready; current deployment/provenance proof incomplete |
| V2 | Living-system states; 80 expected | Provider receipt and promotion missing |
| V3 | Relationship/pattern pack; canonical semantics require reconciliation | Provider receipt and promotion missing |
| V4 | XR/AR/VR pathway pack; canonical semantics require reconciliation | Provider and device proof missing |
| V5 | Becoming/legacy/governance pack | Provider, governance, wiring, and release proof missing |

## Route classification

| Route | Source classification | Evidence-based gap |
| --- | --- | --- |
| `/`, `/home` | Implemented canonical Home entry | Exact-head deployment and browser/mobile evidence missing |
| `/ground` | Implemented operating-world visual shell | Walkable/navmesh/controller behavior not certified |
| `/life-map` | Implemented interactive public-safe constellation | Durable personal graph and production-data integration not certified |
| `/focus` | Implemented selected-memory chamber | Slash/query parity and source-backed memory ingestion proof missing |
| `/replay` | Partially implemented interactive memory film state | Source-backed media, narration, provenance, export, and deletion proof missing |
| `/mirror` | Implemented reflection surface | Personal pattern engine and durable data integration not certified |
| `/passport` | Implemented identity/ownership surface | Live export, deletion, consent, and provenance operations not certified |
| `/status` | Truthful current source exists | Live deployment is stale; exact receipt data not connected |
| `/privacy` | Implemented privacy/legal information route | Must remain distinct from operational controls |
| `/privacy-controls` | Implemented operational consent-control source | Live domain currently serves stale Home content |
| `/location-map` | Implemented route shell | Privacy-safe aggregation and live data proof missing |
| `/ascent`, `/unwind` | Implemented transition routes | Exact-head reduced-motion and browser continuity proof missing |
| `/demo`, `/demo/life-map`, `/demo/replay-film` | Demo/proof surfaces | Must remain explicitly labeled as demo/proof |
| `/spatial/life-map` | Implemented spatial Life Map route | Exact-head browser and visual proof missing |
| `/spatial/life-map-r3f` | Implemented R3F Life Map route | Exact-head browser/performance proof missing |
| `/spatial/ar-vr` | Preview source | Browser lifecycle and physical Quest certification missing |
| `/terms` | Implemented legal route | Legal consistency review remains required |

## Repository disposition summary

| Repository | Canonical role | Current disposition |
| --- | --- | --- |
| `urai-spatial` | Canonical public application and release authority | Keep canonical; exact-head certification and deployment required |
| `asset-factory` | Canonical asset pipeline | Keep canonical; resolve version/cost/receipt controls before paid runs |
| `urai-studio` | Creator/integration studio | Keep; deployment and real integration receipts incomplete |
| `urai-staging` | Firebase staging backend and validation shell | Keep staging-only; never production authority |
| `urai-jobs` | Internal asynchronous execution fabric | Keep; worker lifecycle, queues, DLQ, monitoring, and deploy proof required |
| `urai-privacy` | Privacy operations/control plane | Keep; authenticated export/delete/consent proof required |
| `urai-analytics` | Privacy-safe analytics service | Keep; production persistence/provider/deploy evidence incomplete |
| `urai-content` | Content/schema service | Keep; versioned deployed contract proof required |
| `urai-admin` | Protected operational control plane | Keep; auth, approval, monitoring, and rollback proof required |
| `urai-communications` | Governed communications service | Keep; provider/compliance/retention evidence required |
| `urai-marketing` | Public acquisition/demo surface | Keep separate; production claims must follow canonical evidence |
| `urai-storytime` | Narrative subsystem | Keep as subsystem until integration receipts exist |
| `urai-investors` | Investor surface/materials | Keep separate from product certification |
| `B2Bportal` | Partner/enterprise surface | Keep separate; tenant/auth/privacy proof required |
| `urai-foundation` | Research/foundation materials | Documentary/research role unless runtime is separately certified |
| `urai-labs-llc` | Corporate/public site | Separate corporate surface; IP ownership references must use `URAI IP Holdings LLC` where ownership is described |
| `UrAi` | Legacy/demo/reference application | Manual rollback/migration only; must not automatically deploy canonical production |
| `UrAi-Dev` | Legacy development app | Deprecate or document narrow ownership |
| `UrAiProd` | Legacy production/funding surface | Archive or narrowly define; no canonical deployment authority |

## Version ladder

### V1 — Spatial Foundation

Core route owners and public fallback-safe journey exist. Certification still requires exact-head CI, exact deployment SHA, rollback SHA, route/query parity, browser/mobile/accessibility evidence, asset provenance, privacy workflow proof, and monitoring.

### V2 — Living World

Living-state wiring and an 80-asset contract exist. Provider receipt, approved promotion manifest, complete runtime activation, deployment, and browser proof are missing.

### V3 — Relationships and Patterns

Consent-safe relationship/pattern concepts and fallback sources exist. Canonical asset semantics, privacy review, provider receipt, promotion, runtime activation, and live evidence are missing.

### V4 — Spatial Computing

WebXR/Quest source hardening exists. Provider/browser permission proof, performance/comfort/accessibility validation, physical-device evidence, and deployment receipts are missing.

### V5 — Mirror of Becoming

Identity, legacy, provenance, protected-presence, and governance concepts exist. Production implementation, privacy review, tests, asset receipts, wiring, deployment, and live smoke remain gated.

### V6–V10 — Product expansion ladder

Repository gates and plans exist, but each version remains uncertified until its own machine-readable contract, tests, asset/provider requirements, release artifact, and deployment receipt pass.

### V50 — Canonical deterministic baseline

Defined by the `URAI OS Final Layer Spec` and PR #415. Required evidence includes canonical authority, frozen install, root runtime compile/smoke, `urai-tier1` typecheck/build, exact tested SHA, and a machine-readable artifact. Deployment is explicitly outside V50 certification.

### V100 — Production-integrated operating baseline

Requires the canonical product and deterministic runtime to integrate through versioned contracts, durable persistence, authenticated cross-service flows, observability, production deployment, rollback, and user-journey evidence. Current distributed-runtime work is experimental until rebased and certified after V50.

### V150 — Shared spatial and provider baseline

Requires deterministic shared-state/convergence behavior, reconnect/offline handling, cross-client authorization, approved provider-backed V2/V3 assets, real system integrations, and WebXR/Quest evidence.

### V200 — Audited global production platform

Requires audited global operations: multi-environment release controls, 19+ language/accessibility verification, monitoring, security/privacy/data-rights proof, disaster recovery, provider cost governance, device certification, and complete receipt indexing.

No V50, V100, V150, or V200 version is certified merely because similarly named files or commits exist.

## Critical launch blockers

1. Exact current production SHA and rollback SHA are not established.
2. Current canonical main lacks a connector-visible exact-head passing release artifact.
3. Public deployment is stale for Privacy Controls, Status, and Focus query parity.
4. Provider-generated V2/V3/V4/V5 receipts and approved promotions are incomplete.
5. Asset Factory version semantics and global cost ceilings require resolution before paid generation.
6. XR/Quest physical-device evidence is missing.
7. Authenticated privacy operations, system monitoring, backup/restore, rollback drill, and incident evidence are incomplete.
8. Cross-repository integrations remain primarily contract-level rather than live receipt-backed.
9. The current V50 branch must pass its exact-commit certification workflow before merge.

## Immediate no-cost execution sequence

1. Complete and certify PR #415 without weakening checks.
2. Produce the V50 exact-commit artifact.
3. Merge only the exact passing candidate.
4. Re-run the canonical release workflow on the resulting main SHA.
5. Record current deployed SHA and rollback SHA before production publication.
6. Deploy exact certified main through the canonical workflow.
7. Verify all canonical routes, slash/query parity, resources, console output, mobile/desktop behavior, and truthful Status content.
8. Resolve Asset Factory version semantics and global cost controls.
9. Generate a zero-provider-call cost-exposure receipt.
10. Only then authorize a capped paid provider batch.

## Changes completed during this execution

- Merged PR #416, restoring the README’s canonical product/evidence authority, at merge SHA `4e1606c9ab7cde42b942f62e1d65148df8fadceb`.
- Updated the V50 branch route and smoke contract in commit `89879013edeb80d27afd1468fbcf60d3e235f698`.
- Confirmed the V50 branch persistence manager defaults state outside the repository.
- Refreshed this baseline to the populated Drive specifications and current version definitions.

## Evidence boundary

This document proves the inspected source and the actions recorded above. It does not prove current production deployment, passing CI, active paid providers, durable personal-data persistence, or physical-device certification. Those states require their own receipts.
