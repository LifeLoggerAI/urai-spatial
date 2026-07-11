# URAI Localization, Analytics, and Metadata Audit

**Workstream:** Parallel Workstream D — Product Readiness and Launch Operations  
**Repository:** `LifeLoggerAI/urai-spatial`  
**Frozen source SHA:** `60730edcb5bcedfe2ded2cee9a96cef96dff9510`  
**Stacked parent SHA:** `277347c517290c9dee9d660b1877fdb817b7024b`  
**Evidence date:** 2026-07-11

## Verdict

| Lane | Verdict |
| --- | --- |
| Localization | **UNKNOWN / NOT APPROVED** |
| Analytics and measurement | **BLOCKED — RAW PAYLOAD BOUNDARY** |
| Metadata and discoverability | **PARTIAL SOURCE IMPLEMENTATION — NOT ACCEPTED** |

This audit does not change product code. It identifies source facts and required handoffs before any supported-language, consent-safe analytics, indexing, canonical-domain, installability, or social-sharing claim can be approved.

The current-main delta since the prior audit is limited to the V1 asset-intake workflow, contract, verifier, and safe-resume marker binding. None of the localization, analytics, layout, route-metadata, robots, sitemap, or manifest sources inspected by this audit changed, so the verdicts remain unchanged while ancestry is refreshed.

## Localization

### Direct findings

- The root document declares a fixed `<html lang="en">`.
- The inspected `urai-tier1/package.json` does not declare an obvious localization framework dependency.
- Repository search did not identify a canonical `translations` catalog, a locale route parameter, or `generateStaticParams` locale routing in the inspected source index.
- The directly inspected primary route files contain English strings and metadata.

### What this does not prove

These findings do not prove that no translation material exists anywhere in the repository or connected systems. They do prove that Workstream D did not identify a canonical, launch-governing localization runtime and reviewed locale catalog in the inspected product surface.

### Unsupported claims

No public claim for `19 languages`, `19+ languages`, multilingual production support, reviewed translations, localized accessibility, or localized legal/privacy content is approved by this audit.

### Evidence required per locale

1. canonical locale code and source locale;
2. complete route and component key inventory;
3. translation provenance and machine/human classification;
4. qualified human review for privacy, consent, destructive actions, support, accessibility, and legal language;
5. missing-key and source-string leakage tests;
6. interpolation, escaping, pluralization, dates, numbers, names, and units;
7. pseudo-localization and text-expansion evidence;
8. RTL layout, reading order, focus order, icons, animation direction, and mixed-script handling where applicable;
9. route/deep-link, metadata, sitemap, canonical, and alternate-language behavior;
10. keyboard, screen-reader, mobile, desktop, reduced-motion, zoom, and live deployed proof.

## Analytics and measurement

### Direct findings

The root computation-plane `AnalyticsBridge` defines events containing:

- an event ID, type, timestamp, and numeric metrics;
- `raw: CommunicationPacket`.

`AnalyticsBridge.ingest()` copies the complete communication packet into `raw`. The packet type permits `payload?: unknown` and the communications bridge copies the originating kernel event payload into that field.

The inspected bridge does not itself provide:

- purpose-specific consent checks;
- revocation checks;
- an allowlisted event dictionary;
- prohibited-property enforcement;
- redaction or minimization;
- direct-identifier, precise-location, memory, transcript, prompt, health/body-signal, secret, or device-telemetry exclusion;
- staging/production isolation;
- retention or deletion behavior;
- duplicate control or idempotency;
- event/schema versioning;
- sampling, rate, or cost controls;
- user-visible measurement disclosure;
- audit evidence of attempted and denied events.

The separate client `SpatialAnalyticsBridge` returns `null`; its presence is not evidence of active consent-safe telemetry.

### Risk classification

**BLOCKED — RAW PAYLOAD BOUNDARY**

Because an unconstrained packet payload can be retained as `raw`, this source cannot be approved as a production analytics pipeline without a reviewed data contract and fail-closed filtering before storage, export, or provider transmission.

This is a source-boundary finding. It does not claim that the bridge is currently deployed, externally transmitting data, or receiving personal data.

Draft PR #553 is a separate candidate remediation. It is not merged into this source baseline and does not alter this audit verdict until exact-head checks, review, incorporation, deployment, and live evidence exist.

### Required remediation contract

Before activation or public measurement claims:

1. define a versioned event dictionary with stable names and owners;
2. allowlist properties by event and reject unknown properties;
3. prohibit raw packet, prompt, memory, transcript, free text, precise location, health/body signal, biometric, secret, token, and direct-identifier fields;
4. require purpose-specific consent before event construction and again before export;
5. propagate revocation and deletion to queued and retained events;
6. separate development, preview, staging, and production projects and datasets;
7. document retention, aggregation, sampling, deduplication, retries, DLQ, and deletion;
8. record schema version, application version, exact release SHA, and environment without exposing user content;
9. add positive and negative tests, including malicious nested payloads and serialization edge cases;
10. publish a user-facing measurement disclosure and support path;
11. obtain privacy/security review and exact deployed evidence.

## Metadata and discoverability

### Direct findings

The inspected root layout defines:

- title: `URAI Spatial`;
- description: `Cinematic, spatial, interactive URAI runtime`;
- icon: `/icon.svg`;
- a custom `urai-deployed-sha` metadata field;
- viewport settings;
- fixed English document language.

Several primary route files define route-specific titles and descriptions.

At the frozen source SHA, the expected App Router files were not found at:

- `urai-tier1/src/app/robots.ts`;
- `urai-tier1/src/app/sitemap.ts`;
- `urai-tier1/src/app/manifest.ts`.

Repository search did not identify a current `robots.txt`, canonical `sitemap.xml`, `manifest.webmanifest`, `metadataBase`, `openGraph`, Twitter metadata, or alternates/canonical metadata implementation in the inspected source index.

### Consequences

The audit does not approve claims that:

- `urai.app` is consistently declared as canonical across every route;
- private, diagnostic, account, profile, place, query-bearing, preview, or demo routes have correct indexing policy;
- a complete sitemap exists;
- social shares have verified titles, descriptions, images, dimensions, crops, alt text, or cache behavior;
- the product is installable as a PWA;
- localized metadata or alternate-language links exist;
- structured data is current and claim-checked.

### Required metadata acceptance

1. explicit canonical production origin and environment-safe `metadataBase`;
2. route-level canonical handling, including slash/query rules and dynamic routes;
3. robots policy for public, private, account, profile, place, demo, preview, diagnostic, internal, and error routes;
4. sitemap generated only from approved public routes and current canonical URLs;
5. Open Graph and social metadata with verified assets, dimensions, mobile-safe crops, alt text, and claim review;
6. web app manifest only if installability, icons, start URL, scope, display mode, colors, offline behavior, and updates are verified;
7. structured data limited to truthful, supported entities and product facts;
8. localized metadata and `hreflang` only for reviewed locales;
9. no indexing or social leakage of personal memories, precise locations, private profiles, tokens, query data, or internal diagnostics;
10. custom-domain fetch evidence for headers, HTML metadata, robots, sitemap, social cards, redirects, and cache invalidation tied to the exact deployed SHA.

## Current approved language

- Source language observed in the inspected product surface: English.
- Supported-language claim: not approved.
- Analytics activation claim: not approved.
- Consent-safe measurement claim: not approved.
- Canonical-domain/indexing completeness claim: not approved.
- PWA/installability claim: not approved.
- Social-sharing completeness claim: not approved.

## Handoffs

- Localization runtime/catalog: product and localization owner.
- Privacy/legal translation review: qualified human reviewers and legal/privacy authority.
- Raw analytics payload boundary: runtime, analytics, privacy, and security owners.
- Metadata, robots, sitemap, manifest, structured data, and social cards: web product owner with release evidence review.
- Exact custom-domain verification: authorized release workstream under issues #413 and #414.

## Claim boundary

This audit supports only the narrow statement that English source copy and partial metadata exist, while canonical localization evidence, consent-safe analytics certification, and complete discoverability evidence remain unestablished. It does not prove an active analytics export, a privacy incident, or absence of all translation/metadata material outside the inspected scope.
