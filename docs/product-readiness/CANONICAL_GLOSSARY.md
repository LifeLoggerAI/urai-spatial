# URAI Product-Readiness Canonical Glossary

**Authority date:** 2026-07-11  
**Repository baseline:** `LifeLoggerAI/urai-spatial@60730edcb5bcedfe2ded2cee9a96cef96dff9510`

## Usage rule

Use these definitions for product-readiness review, launch copy, support content, metadata, localization, demonstrations, and release notes until exact newer evidence supersedes them.

A term may describe product intent without proving production behavior. Present-tense capability claims require exact implementation, test, deployment, rollback, live-smoke, and applicable provider/device evidence.

| Term | Evidence-bounded meaning | Required qualifier / prohibited inference |
| --- | --- | --- |
| **URAI** | The broader URAI ecosystem, product direction, repositories, and supporting operational systems. | Do not use the umbrella name to imply every repository, provider, workflow, route, or future capability is integrated or live. |
| **URAI Spatial** | The canonical public URAI web application in `LifeLoggerAI/urai-spatial`, runtime root `urai-tier1`, intended public domain `urai.app`. | Current release mode is `fallback-demo`; source presence and route reachability do not equal production certification. |
| **Home** | The entry realm and first step of the canonical public journey. | An implemented or reachable Home route does not prove onboarding completion, authentication, persistence, provider activity, or deployment freshness. |
| **Ground** | The grounded/private-world step after Home in the canonical journey. | Describe visible fallback-safe behavior only; do not imply a live autonomous workforce, external actions, or persistent private operations without receipts. |
| **Life Map** | The spatial memory/navigation realm in the canonical journey. | Do not claim a user's private memory graph is persisted, complete, clinically meaningful, or provider-grounded without consent, ownership, deletion/export, and live evidence. |
| **Focus** | The selected-memory or focused-context realm in the canonical journey. | Current spatial-web meaning governs this launch. Older standalone desktop-first Drive specifications are future/historical input, not current release authority. |
| **Replay** | The memory-replay or cinematic reconstruction step following Focus. | Do not claim factual reconstruction, perfect recall, evidentiary accuracy, therapeutic effect, or provider-generated media unless separately proven and disclosed. |
| **Mirror** | A reflection/pattern realm associated with interpretation, identity, or becoming. | Must not be framed as diagnosis, judgment, mental-health assessment, certainty, or an active V5 capability without implementation, privacy, test, deploy, and live receipts. |
| **Passport** | The identity, consent, ownership, provenance, and access-control realm in the canonical journey. | Do not imply legal identity verification, title transfer, universal ownership guarantees, complete export/deletion, or production authentication unless proven. |
| **Status** | The public production-truth surface intended to expose evidence-backed release state. | `live`, `ready`, or `certified` labels are valid only when derived from immutable exact-SHA evidence rather than hard-coded copy. |
| **Privacy Controls** | The dedicated consent/privacy-control surface and source owner for user-facing control language. | Do not claim complete revocation, export, deletion, retention, legal-hold, tenant isolation, or provider enforcement until end-to-end evidence exists. |
| **Location Map** | A supporting route for place/location-oriented product experiences. | Do not claim precise-location collection, global emotional mapping, live population signals, or consent coverage without explicit provider, privacy, and deployment proof. |
| **Orb / companion** | A route-aware companion interface, visual guide, or fallback interaction layer. | Use `companion` or `orb` rather than implying a conscious being. Do not claim memory grounding, autonomous action, continuous listening, or provider intelligence without evidence. |
| **Memory / memories** | User-facing content or sample representations used by Life Map, Focus, Replay, and related experiences. | Distinguish synthetic/sample/fallback content from authenticated personal content. Never imply durable storage, completeness, factual accuracy, or deletion/export guarantees without receipts. |
| **Place / places** | User-facing spatial or contextual representations associated with routes such as `/place/[placeId]`. | Do not infer real-world location verification, ownership, safety, public availability, or precise geolocation processing. |
| **Consent** | Purpose-specific, informed permission that must be explicit, revocable, and enforceable for sensitive processing. | A checkbox, copy block, or source policy is not proof of downstream enforcement, revocation propagation, export/deletion coverage, or legal sufficiency. |
| **Provenance** | Evidence of where content, assets, releases, decisions, or transformations came from and which exact versions produced them. | Do not equate a filename, document title, commit message, or metadata timestamp with authenticated provenance. Exact hashes, SHAs, receipts, and authority records are required. |
| **Provider** | An external or internal service that supplies model, media, persistence, analytics, communications, device, or other runtime capability. | A seam, environment variable, adapter, mock, fallback, candidate asset, or configured name does not prove an active provider call or production service. |
| **Fallback** | A privacy-safe, local/procedural/sample behavior used when providers, data, permissions, devices, or production dependencies are unavailable. | Fallback behavior must be visibly distinguishable from provider-backed behavior and must not be marketed as equivalent live capability. |
| **Demo** | A bounded demonstration using synthetic, sample, staged, fallback, or partially verified behavior. | A demo is not production evidence. Disclose synthetic content, unavailable providers, certification-pending areas, and device limitations. |
| **Implemented** | Source code or content exists in the reviewed repository/ref. | Does not mean tested, merged, deployed, reachable, current on the custom domain, provider-backed, accessible, localized, secure, or production-ready. |
| **Verified in repository** | A source fact has been directly checked at an exact repository SHA. | Does not prove production deployment or external behavior. |
| **Tested** | Named checks passed against an exact unchanged SHA with retained output or artifacts. | Local results, stale runs, queued checks, or checks attached to another head do not qualify. |
| **Deployed** | An exact tested SHA was released to the named target and recorded in an immutable deployment receipt. | An HTTP 200, Firebase project mention, hosting URL, or workflow definition alone does not prove the deployed SHA. |
| **Live** | Exact deployed behavior has passed current custom-domain route, content-marker, interaction, console, resource, accessibility, and relevant browser/device smoke. | Avoid `live` for source-only, fallback-only, stale, candidate, queued, or unverified behavior. |
| **Production** | The controlled environment and release state governed by exact deployment authority, secrets, monitoring, incident handling, rollback, and evidence. | `production` in a filename, branch, variable, title, or UI label is not production certification. |
| **Production-ready** | All applicable product, security, privacy, accessibility, localization, support, analytics, metadata, deployment, rollback, provider, device, and operational gates are complete at one exact release. | This term is not currently approved for URAI Spatial. |
| **Certified** | A defined certification scope has been completed by an identified authority with retained evidence. | Never use generically. State what was certified, by whom, against which version, date, criteria, and evidence. |
| **Staging** | A non-production environment with explicit project/tenant authority, isolated data, controlled credentials, deploy receipt, smoke, and rollback. | A branch, preview, local server, candidate build, or invented project name is not staging. |
| **Autonomous** | A system performs bounded actions without per-step human input under explicit permissions, controls, observability, and rollback. | Do not claim autonomous real-world action from UI copy, planned agents, job definitions, simulations, or mocked integrations. |
| **Private / privacy-safe** | Behavior is designed to minimize exposure and fail closed within the proven scope. | Do not convert this into `all data is local`, `zero data leaves the device`, legal compliance, or complete privacy guarantees without architecture and runtime evidence. |
| **Local** | Processing or storage occurs on the user's device or a specified local runtime for the named operation. | Do not use globally unless every relevant data path, provider call, telemetry event, backup, export, and failure mode is proven local. |
| **Analytics** | Consent-gated measurement events defined by a versioned dictionary and prohibited-property rules. | Do not send memories, transcripts, prompts, health/body signals, precise location, secrets, or direct identifiers merely because an analytics SDK exists. |
| **Accessibility** | Product behavior supports defined assistive technologies, keyboard use, semantics, contrast, motion preferences, captions/transcripts, and recovery patterns. | Source attributes or isolated automated checks are not accessibility certification. State tested platforms, tools, routes, and limitations. |
| **Localization / supported language** | A locale has a complete technical catalog plus recorded translation provenance, review status, fallback behavior, and route/accessibility validation. | Machine translation or a locale code alone is not a reviewed supported language. Legal/privacy language requires qualified human review. |
| **AR / VR / WebXR / Quest** | Spatial-computing pathways with separate browser, permission, lifecycle, comfort, performance, input, and physical-device evidence requirements. | Source hardening, preview routes, simulator behavior, or candidate assets do not constitute device certification. |
| **V1** | Spatial Foundation: core route chain and source owners, with deployment/rollback/live evidence still required. | Do not infer full production certification or completed asset delivery from an intake contract. |
| **V2** | Living World capabilities and assets, currently provider/receipt/promotion gated. | Do not claim active provider-backed V2 behavior while canonical readiness remains incomplete. |
| **V3** | Relationship/pattern capabilities and assets, currently privacy/provider/activation gated. | Do not claim active or psychologically authoritative interpretation. |
| **V4** | Spatial-computing pathways, currently browser/provider/device gated. | Do not claim Quest, WebXR, AR, or VR certification without applicable evidence. |
| **V5** | Mirror of Becoming, identity, legacy, provenance, and protected-presence concepts. | Treat as implementation- and privacy-gated; do not market as complete or live. |

## Approved current one-sentence description

> URAI Spatial is reachable as a privacy-safe fallback/demo spatial shell with a substantial V1 web experience and future provider seams.

Any stronger description requires a new claim review tied to an exact tested SHA, deployed SHA, rollback SHA, live-smoke receipt, and applicable provider/device evidence.
