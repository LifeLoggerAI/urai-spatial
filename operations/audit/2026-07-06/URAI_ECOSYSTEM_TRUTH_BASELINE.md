# URAI Ecosystem Truth Baseline — 2026-07-06

## Audit scope

This evidence baseline covers the accessible LifeLoggerAI GitHub organization, current Google Drive roadmap/design sources, `urai-spatial`, and `asset-factory`. It intentionally separates repository presence from production proof.

No paid generation, deployment, merge, secret change, or destructive production action was performed.

## Canonical starting point

| Item | Evidence-backed state |
| --- | --- |
| Public app repository | `LifeLoggerAI/urai-spatial` |
| App runtime | `urai-tier1` |
| Default branch | `main` |
| Main SHA observed during audit | `b0e29681956e2892f3c38d1cf5f99ffa8da1ec57` |
| Firebase Hosting source | `urai-tier1` |
| Firebase Functions source | `apps/functions` |
| Functions runtime | Node.js 22 |
| Intended Firebase project | `urai-4dc1d` from repository scripts/history; exact deployed receipt is still required |
| Public domain | `https://urai.app` responds and exposes the route shell |
| Current deployed SHA | **Not established** |
| Rollback SHA | **Not established** |
| Current exact-head passing SHA | **Not established** |
| Current production asset-pack receipt | **Not established** |

## Executive truth

URAI currently has a substantial multi-repository application, governance, orchestration, content, analytics, privacy, communications, admin, studio, marketing, and asset-generation foundation. The public Spatial route shell is live and multiple routes are reachable. The strongest repository work is the large set of explicit contracts, validators, safety boundaries, route shells, test commands, and production-evidence requirements.

URAI is not yet one fully certified production system. Most subsystem repositories explicitly say that live deployment, real credentials/providers, authenticated workflows, monitoring, rollback, hardware proof, or owner signoff remain pending. Several repositories call repo-side scaffolding or local proof “complete” while also correctly blocking a production claim.

The public Spatial experience is a polished HTML/CSS/React spatial presentation with some interactive route state. It is not yet one continuous rendered 3D world across Home, Ground, Life Map, Focus, and Replay. That architecture remains in draft PRs. Ground is a composed static scene with HTML inspection controls, not demonstrated first-person locomotion. Life Map is an interactive 34-node DOM/CSS constellation generated from repeated seed labels. Focus is a styled selected-memory chamber. Replay has a real timed play/pause/scrub state machine and visual phase rings, but it does not yet reconstruct or stream source-backed user media, narration, subtitles, provenance, or a generated film.

XR remains preview-grade until a real Quest/device evidence package proves session entry, rendering, controls, comfort, performance, exit/re-entry, and route continuity. A recently added Three renderer is only a small bridge scene and does not by itself certify WebXR.

## Source-of-truth conflicts

### Spatial runtime authority

`docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md` names `TierOneExperience -> HomeScene` as route authority. Current `/` and `/home` instead render `FinalHomeThreshold -> HomeSpatialWorldFinal`. The lock document remains marked as a candidate and its final checklist is unchecked.

Main has also accumulated new simulation, persistence, cockpit, desktop shell, visualization, and XR commits after the older launch evidence. No connector-visible workflow runs or combined status contexts were found for current main. Issue #414 tracks the required exact-head re-certification.

### Asset Factory version semantics

The canonical catalog currently defines:

- V1 — Genesis Public Route World — 53 expected outputs
- V2 — Living System States — 80 expected outputs
- V3 — Relationship, Shadow and Pattern World — 14 expected outputs
- V4 — WebXR, AR and VR Pathway — 39 expected outputs
- V5 — Mirror of Becoming and Autonomous Legacy — 27 expected outputs

A legacy executable builder still documents/builds V3 as XR and V4 from remapped older assets. The newer wrapper overrides portions of that behavior, so results depend on the entry point used. This must be resolved before another paid provider run. Asset Factory issue #140 tracks the fix.

### Drive specifications

The substantial `life-map.txt`, `replay.txt`, `deployment.txt`, and Genesis Visual Handoff Pack are product/design/governance sources, not implementation proof.

Three newly named Drive specifications exported during this audit as only a UTF-8 BOM with no usable content:

- URAI System Architecture Spec v1
- URAI OS Final Layer Spec
- URAI Brain Map — Interactive OS Cockpit Spec (Live)

They must not be treated as architecture authority until populated and versioned.

## Asset Factory truth

### Current capabilities

- Manifest-driven image generation.
- Offline deterministic Pillow renderer for CI/mechanical proof.
- OpenAI Images provider adapter.
- One generic custom HTTPS JSON/image provider adapter.
- Target aspect-ratio normalization and PNG output.
- Per-output render metadata sidecars.
- Up to three provider attempts per asset by default.
- Validation, scoring, preview, seed, export, Spatial handoff, receipt, and version selection stages.
- Fail-closed provider mode when credentials are absent.
- Billing-hard-limit receipt handling.

### Current limitations

- Offline proof art is not production provider art.
- Main does not impose a maximum batch dollar amount.
- Main does not record provider unit cost or total evidenced spend in receipts.
- Provider-side asynchronous job polling/cancellation is absent.
- Retry behavior can multiply cost up to the configured attempt/round limits.
- Generated version manifests are runtime outputs rather than durable immutable release receipts.
- The open cost-control PR changes only the V1 round renderer and also includes an unrelated workflow-trigger edit; it requires review before it can protect every V2–V5 path.
- No committed exact 80/80 V2, 14/14 V3, 39/39 V4, or 27/27 V5 provider receipt was found on main.
- The last documented V2 provider attempt stopped on `billing_hard_limit_reached` before a successful round.

### V1 base manifest

The checked-in base prompt manifest contains 47 prompted entries:

- Home: 4
- Ground: 7
- Life Map: 5
- Focus: 2
- Replay: 2
- Mirror: 3
- Passport: 3
- Privacy: 4
- Location/emotional weather: 3
- Status: 3
- Workforce avatars: 6
- Orb states: 3
- Social/Open Graph: 2

The canonical V1 builder adds six additional avatars for 53 expected outputs.

## Route classification

| Route | Classification | Evidence-based gap |
| --- | --- | --- |
| `/`, `/home` | Built and publicly reachable | DOM/CSS threshold scene; not proven continuous WebGL/XR world |
| `/ground` | Built visual shell | Static HTML/CSS composition; no proven walking/navmesh/collision/controller loop |
| `/life-map` | Built interactive visual prototype | 34 generated seed nodes; repeated labels/assets; no personal durable graph proof |
| `/focus` | Built visual chamber | One fixed sample memory; no source ingestion/provenance workflow |
| `/replay` | Partially implemented | Timed controls/state exist; no source-backed documentary pipeline or real rendered media |
| `/mirror` | Built visual shell | Static reflection stack; no verified pattern engine or personal data integration |
| `/passport` | Built visual shell | Ownership copy exists; export/delete/provenance operations not proven on this public route |
| `/status` | Publicly reachable but over-broad | Hardcoded route state; no deployed SHA, rollback SHA, manifest SHA, evidence timestamp |
| `/privacy-controls` | Reachable but route/content mismatch requires review | Current returned content resembles the Home threshold rather than a dedicated operational consent console |
| `/location-map` | Built/partially verified | Requires live privacy-safe aggregation/data evidence |
| `/ascent`, `/unwind` | Built transition shells | Route continuity and reduced-motion behavior need exact-head browser proof |
| `/demo`, `/demo/replay-film` | Showcase surfaces | Must remain clearly labeled as demo/proof |
| `/spatial/ar-vr` | Preview | Real device/Quest certification missing |

## Repository disposition summary

| Repository | Role | Current disposition |
| --- | --- | --- |
| `urai-spatial` | Canonical public spatial app | Keep canonical; re-establish source-of-truth and exact-head release receipt |
| `asset-factory` | Canonical asset pipeline | Keep canonical; resolve version split and global cost/receipt controls before paid runs |
| `UrAi` | Conservative V1 memory-to-world demo and registry | Keep as demo/reference or formally consolidate; do not let it compete with Spatial public authority |
| `urai-studio` | Creator/admin studio and integration shell | Built foundation; production evidence incomplete |
| `urai-admin` | Protected operations/control plane | Built foundation; auth/live/monitoring/rollback proof required |
| `urai-jobs` | Internal asynchronous execution fabric | Strong runtime contracts; real Cloud Run worker lifecycle proof required |
| `urai-analytics` | Privacy-safe analytics service | Preview/staging only; providers, persistence, deployment evidence pending |
| `urai-privacy` | Privacy control plane | Staging scaffold with substantial code; authenticated live export/delete/consent proof pending |
| `urai-content` | Content contracts and runtime scaffold | Repo-side lock; external deployment/provider evidence pending |
| `urai-marketing` | Public acquisition/waitlist/demo | Public no-domain surface; strict production lock incomplete |
| `urai-communications` | Governed communications/call intelligence | Provider adapters exist; live provider/compliance/retention/rollback evidence pending |
| `urai-storytime` | Story/narrative subsystem | Treat as a subsystem until production integration evidence is attached |
| `urai-investors` | Investor surface/materials | Keep separate from product truth and gate claims to evidence |
| `B2Bportal` | Partner/enterprise surface | Keep separate; privacy/auth/tenant evidence required |
| `urai-staging` | Staging/integration environment | Never treat as production authority |
| `UrAi-Dev` | Development/legacy app | Deprecate or document exact ownership boundary |
| `UrAiProd` | Older production/funding materials | Archive or narrowly define; must not compete with Spatial deployment authority |
| `urai-foundation` | Foundation/research materials | Documentary/research role only unless a runtime is explicitly certified |
| `urai-labs-llc` | Corporate/public site | Separate corporate surface |

## Roadmap reconstruction

### V1

Public Genesis route world and sample memory journey. Code and public routes exist, but fresh exact-head certification, immutable deploy/rollback receipt, final asset provenance, desktop/mobile visual QA, privacy workflow proof, and production monitoring remain.

### V2

80 living-system state assets: helper states, ground objects, memory-star states, Focus variants, Replay templates, Mirror patterns, Passport states, onboarding, and accessibility equivalents. Manifest contract exists. Provider receipt and complete Spatial wiring are missing.

### V3

Canonical catalog: 14 relationship/family/friend/mentor/legacy/community/storytime/identity assets. Source manifest exists, all entries are prompted. Exact provider receipt, quality gate, promotion, wiring, and production visibility are missing.

### V4

Canonical catalog: 39 XR/AR/VR pathway assets. Visual assets cannot prove hardware support. Provider receipt, app wiring, real Quest validation, performance/comfort/accessibility proof, and device evidence are missing.

### V5

27 becoming/autonomous-legacy/governance assets. Contract exists but requires version-contract cleanup, receipt, wiring, governance review, and release evidence.

### V6–V10 / V50+

The Spatial repo contains V1–V10 gating/scaffolding and newer v60-style runtime work, but scaffolding is not a shipped roadmap. Drive describes broad eras such as V1–V50, V50–V500, and V500–V5000. Exact V50, V100, V150, and V200 product contracts, counts, schemas, tests, cost gates, and promotion criteria were not found. These versions are **undefined**, not partially complete, until machine-readable specifications are approved.

## Critical launch blockers

1. Current production SHA, passing SHA, rollback SHA, manifest SHA, and asset-pack receipt are not established.
2. Current main lacks connector-visible exact-head CI evidence.
3. Source-of-truth lock is stale relative to actual route owners.
4. Duplicate/open manifest-path fixes and continuous-world drafts remain unresolved.
5. Provider-generated asset receipts are missing for canonical version packs.
6. Asset Factory version semantics conflict across executable modules.
7. Global cost ceiling and cost evidence are incomplete.
8. XR/Quest hardware proof is missing.
9. Public route state labels are broader than the attached evidence.
10. Authenticated privacy workflows, monitoring, rollback, and incident evidence are incomplete across dependent subsystems.

## Immediate no-cost execution sequence

1. Merge no code yet; first reconcile the canonical runtime and version contracts.
2. Fix Asset Factory issue #140 with tests that prove every forge entry point resolves the same V1–V5 matrix.
3. Extend cost controls to every versioned provider path and add a zero-call dry-run cost-exposure receipt.
4. Resolve/supersede duplicate Spatial manifest-path PRs.
5. Update the Spatial source-of-truth lock to current owners.
6. Run exact-head install/typecheck/lint/unit/build/static/browser/accessibility/mobile gates in GitHub Actions.
7. Generate an immutable release receipt from those artifacts.
8. Make `/status` read the receipt and distinguish `reachable`, `built`, `verified`, `deployed`, and `device-certified`.
9. Capture desktop/mobile screenshots and attach them to the immutable SHA.
10. Only after free gates pass, authorize one capped provider batch with receipt capture. Do not trigger V2/V3/V4/V5 generation before the cost and version-contract fixes pass.

## Changes made during this audit

- Created `asset-factory` issue #140: resolve V3/V4 executable contract split before paid forge runs.
- Created `urai-spatial` issue #414: re-establish exact-head production truth after current main changes.
- Added this audit baseline on branch `audit/ecosystem-truth-20260706`.
