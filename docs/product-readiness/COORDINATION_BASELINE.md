# Workstream D Coordination Baseline

**Workstream:** Parallel Workstream D — Product Readiness and Launch Operations  
**Repository:** `LifeLoggerAI/urai-spatial`  
**Runtime authority:** `urai-tier1`  
**Canonical branch:** `main`  
**Frozen base SHA:** `60730edcb5bcedfe2ded2cee9a96cef96dff9510`  
**Work branch:** `ws-d/docs-product-readiness-20260711`  
**Evidence date:** 2026-07-11

## Purpose

This file records the collision-safe Workstream D baseline. It does not certify routes, providers, devices, localization, analytics, deployment, rollback, legal language, asset delivery, or public-launch readiness.

Workstream D owns evidence-bounded product language, route-content acceptance criteria, onboarding and support readiness, localization review records, consent-safe analytics definitions, metadata/discoverability review, public-claim reconciliation, launch-package assembly, and immutable receipts for those activities.

## Governing authority

Use the strictest current evidence in this order:

1. `LifeLoggerAI/urai-spatial` current `main`, exact-head workflow evidence, immutable deployment receipts, [STATUS.md](../../STATUS.md), and [EVIDENCE.md](../../EVIDENCE.md).
2. Issues #413 and #414 for the canonical program and production-truth ledgers.
3. Current reviewed pull requests and exact-head receipts for work not yet merged.
4. The Drive document **URAI Document Authority Register and Mixed-Era Decision Record — 2026-07-10** for classifying Drive material.
5. Product-intent documents only where they remain compatible with current repository evidence.

When sources conflict, present-tense launch claims must follow the stricter, newer, exact-SHA evidence. A filename, document title, route HTTP 200, source implementation, queued workflow, draft pull request, intake contract, or local test is not production certification.

## Frozen coordination snapshot

| Area | Current evidence | Workstream D boundary |
| --- | --- | --- |
| Canonical product | `main@60730edcb5bcedfe2ded2cee9a96cef96dff9510` | Read-only baseline; D does not alter runtime or release authority in this documentation change. |
| V1 asset intake | Current `main` contains a read-only 53-asset handoff contract and verifier with `promotion: false`. | Intake definitions do not prove generation, certification, copying, registry completion, promotion, activation, deployment, or spend. |
| Program ledger | Spatial issue #413 | D reports status here instead of creating a competing program record. |
| Production truth | Spatial issue #414 | Deployment, rollback, domain parity, provider, and device claims remain controlled here. |
| Release controls | Spatial PR #539, draft, head `f62e2ff5860e107f180715377a7cd87605898ade` | Owned by its release workstream; no workflow/runbook files touched. |
| Sensory assurance | Spatial PR #544, draft, head `7896f75c340f2ea3e046529eb2ea6c55255b7231`, targeting the #541 branch | Owned by Workstream B; no sensory assets, runtime code, verifiers, or receipts touched. |
| System registry | `LifeLoggerAI/urai-admin#45`, draft, head `5785607f878e272ee53149098ab334f2e0fadf4a` | Registry inventory and seed authority remain owned there; D does not duplicate registry records. |
| Governed content | `LifeLoggerAI/urai-content#67`, head `3d88d97897b6c3036cd21a871645a2762896a1e2`; companion `LifeLoggerAI/urai-content#68` merged into it | Prompt governance remains owned in `urai-content`; D does not change those files. |
| Drive authority | Document Authority Register; System Architecture Spec; Launch Control workbook | Drive is supporting evidence, not a substitute for exact repository/deployment receipts. |

## Collision controls

The Workstream D baseline scope is limited to files below `docs/product-readiness/`.

Excluded from this change:

- application source, route components, CSS, assets, manifests, providers, analytics runtime, localization runtime, Firebase configuration, workflows, release scripts, tests, deployment receipts, registry files, and existing canonical ledgers;
- any file changed by Spatial PRs #539 or #544;
- any file changed by `LifeLoggerAI/urai-admin#45` or `LifeLoggerAI/urai-content#67`;
- production deployment, rollback, provider calls, billing actions, secret changes, database writes, Gmail outreach, or external publication.

Before every later write, D must refresh `main`, active PR heads, issue #413/#414 state, and overlapping file ownership. If an owner or SHA has moved, the previous review evidence is stale until rechecked.

## Current product-readiness verdict

**PRODUCT NOT READY FOR PUBLIC LAUNCH**

Current repository authority describes the release as `fallback-demo` with incomplete production certification. The narrow evidence-supported description is:

> URAI Spatial is reachable as a privacy-safe fallback/demo spatial shell with a substantial V1 web experience and future provider seams.

This baseline does not approve unqualified claims including `production-ready`, `fully autonomous`, `certified`, `clinical`, `all data is local`, `all capabilities are live`, provider-backed V2/V3 activation, authenticated personal-memory persistence, completed V1 asset delivery, or physical XR/Quest certification.

## Workstream D acceptance lanes

The following remain open and require separate exact receipts:

1. Route-content acceptance for purpose, actions, privacy, accessibility, loading, empty, offline, degraded, permission-denied, destructive-action, and recovery states.
2. First-run, returning-user, guest, consent, permission, first-memory, skipped-step, and unsupported-feature onboarding behavior.
3. Locale inventory, source locale, translation provenance, human review, legal/privacy review, interpolation, pluralization, pseudo-localization, expansion, fallback, and RTL behavior.
4. Help content and support runbooks for account, memory, replay, export/deletion, consent, privacy, provider, accessibility, security, and degraded-service incidents.
5. Consent-gated analytics taxonomy, prohibited properties, revocation, environment isolation, versioning, deduplication, retention, and funnel semantics.
6. Titles, descriptions, canonical URLs, robots, sitemap, private-route indexing, Open Graph, manifests, structured data, and localized metadata.
7. Claim-by-claim launch package review tied to exact deployed SHA, rollback SHA, provider status, supported platforms/locales, known limitations, screenshots, demos, and receipt index.

No lane is complete merely because its route, source file, contract, or workflow exists.

## Handoff rule

Workstream D may prepare documentation and acceptance receipts, but it must hand implementation defects to the owning repository/workstream. D must not silently fix release controls, provider behavior, legal conclusions, registry authority, or runtime code while representing the work as product-readiness documentation.
