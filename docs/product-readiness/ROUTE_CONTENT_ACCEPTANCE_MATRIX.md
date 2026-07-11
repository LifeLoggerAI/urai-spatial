# URAI Route-Content Acceptance Matrix

**Workstream:** Parallel Workstream D — Product Readiness and Launch Operations  
**Repository:** `LifeLoggerAI/urai-spatial`  
**Source baseline:** `60730edcb5bcedfe2ded2cee9a96cef96dff9510`  
**Stacked parent:** Workstream D PR #546 head `a2b4f26ff927da2666ad9ece70984855be3f5e1e`  
**Evidence date:** 2026-07-11

## Verdict

**NO ROUTE IS ACCEPTED AS PUBLIC-LAUNCH COMPLETE BY THIS AUDIT.**

This is a source-content audit, not browser, deployment, provider, accessibility, localization, privacy-enforcement, or legal certification. A route can be implemented in source while still lacking complete user-facing states and exact live evidence.

The commits between the prior route-audit source and this refreshed baseline change only the V1 asset-intake workflow/contract/verifier. None of the route owners listed below changed, so the route findings remain source-consistent while their ancestry is refreshed.

## Acceptance vocabulary

- **SOURCE OWNER VERIFIED** — the route file and its immediate owner were directly inspected at the frozen SHA.
- **SOURCE CONTENT PARTIAL** — purpose or actions are visible in source, but one or more required content states are absent or unverified.
- **INVENTORIED ONLY** — the route appears in the source Status inventory, but its route owner was not inspected in this receipt.
- **INVENTORIED PREVIEW** — the route is marked as a preview in the Status inventory and requires separate physical/device verification.
- **BLOCKED BY RUNTIME EVIDENCE** — copy describes behavior whose enforcement cannot be proven from the page source.
- **NOT ACCEPTED** — launch acceptance has not been earned.

## Required acceptance dimensions

Every public route must eventually have evidence for all applicable dimensions:

1. clear purpose and current capability boundary;
2. primary and secondary actions with accurate labels;
3. privacy, consent, data-use, provider, and device disclosure;
4. semantic structure, keyboard behavior, focus management, screen-reader names, contrast, reduced motion, zoom, and error announcement;
5. loading, empty, offline, degraded-provider, unsupported-browser/device, and permission-denied states;
6. destructive-action confirmation, consequences, cancellation, progress, completion, failure, and recovery;
7. guest, signed-in, returning-user, missing-data, revoked-consent, deleted-data, and expired-session behavior where applicable;
8. locale fallback, interpolation, pluralization, expansion, RTL, and reviewed legal/privacy language;
9. current custom-domain route, slash/query parity, resource, console, interaction, mobile, and desktop proof tied to the exact deployed SHA;
10. support or escalation path for failures that cannot be resolved in-product.

## Primary launch route findings

| Route | Direct source finding | Content/state gaps | Result |
| --- | --- | --- | --- |
| `/` | Metadata names `URAI Spatial` and delegates to `FinalHomeThreshold`. | Immediate owner content, first-run distinction, guest/auth state, loading, offline, degraded, permission, recovery, and live parity were not accepted here. | SOURCE OWNER VERIFIED — NOT ACCEPTED |
| `/home` | Metadata names `URAI Home` and delegates to the same `FinalHomeThreshold` owner. | Root/Home parity, onboarding state, provider boundary, unsupported-device behavior, complete accessibility, and live parity remain unverified. | SOURCE OWNER VERIFIED — NOT ACCEPTED |
| `/ground` | Metadata calls Ground a final walkable first-person layer; route mounts `GroundSpatialWorldClean` and a scene ID. | “Final” and “walkable first-person” require browser/input/mobile/reduced-motion evidence. Empty, offline, provider/action permission, destructive, and recovery states were not established. | SOURCE CONTENT PARTIAL — NOT ACCEPTED |
| `/life-map` | Metadata describes a React Three Fiber spatial memory field and mounts `SpatialLifeMapCanonical`. | Sample versus personal memory disclosure, empty map, missing asset, unsupported WebGL, reduced motion, permission, deletion/revocation, and recovery states were not established. | SOURCE CONTENT PARTIAL — NOT ACCEPTED |
| `/focus` | Metadata identifies the Final Focus Chamber; a Suspense fallback exposes an accessible loading label. | Loading is visually minimal; missing memory, invalid query, deleted/revoked memory, offline, replay-unavailable, return/recovery, and live interaction evidence remain unverified. “Final” is not launch certification. | SOURCE CONTENT PARTIAL — NOT ACCEPTED |
| `/replay` | Source provides a loading label, playback-control and narrator-panel labels, route fingerprint, and cinematic replay owner. | Synthetic/provider-generated disclosure, unavailable media, invalid or deleted memory, pause/seek/failure behavior, captions/transcript, reduced motion, factual-accuracy boundary, export/share, and recovery remain unaccepted. | SOURCE CONTENT PARTIAL — NOT ACCEPTED |
| `/mirror` | Source explains a private reflection realm, names navigation actions, and states that reflection is permissioned. | “Pattern intelligence,” orb guidance, privacy, interpretation boundaries, missing-data, revoked-consent, emotional-safety recovery, loading/degraded, and accessibility behavior require separate evidence. | SOURCE CONTENT PARTIAL — NOT ACCEPTED |
| `/passport` | Route statically mounts `FinalPassportVault`. | The route file itself does not establish identity, consent, provenance, auth, export/deletion, empty, locked, expired, permission-denied, destructive, recovery, accessibility, or live states. | SOURCE OWNER VERIFIED — NOT ACCEPTED |
| `/status` | Source explicitly distinguishes implementation from production proof, labels production pending, and lists tracked routes. | Status still relies on source arrays and `launchTruth`; immutable deployed/rollback receipt derivation and current custom-domain parity remain required. Route labels such as `implemented` must not be read as live certification. | SOURCE CONTENT PARTIAL — NOT ACCEPTED |

## Trust and supporting route findings

| Route | Evidence scope | Result |
| --- | --- | --- |
| `/privacy-controls` | Directly inspected. Source presents consent, deletion, export, location, model-access, workforce-action, and legacy controls, but the page is primarily descriptive and displays control names as non-interactive spans. Claims such as “private by default,” “no hidden raw-data sharing,” visible export/deletion controls, reversible consent, and approval before action require end-to-end enforcement, revocation, audit, export/deletion, provider, and live evidence. | BLOCKED BY RUNTIME EVIDENCE — NOT ACCEPTED |
| `/location-map` | Present in the Status inventory as implemented; route owner not inspected in this receipt. | INVENTORIED ONLY — NOT ACCEPTED |
| `/ascent` | Present in the Status inventory as implemented; route owner not inspected in this receipt. | INVENTORIED ONLY — NOT ACCEPTED |
| `/unwind` | Present in the Status inventory as implemented; route owner not inspected in this receipt. | INVENTORIED ONLY — NOT ACCEPTED |
| `/demo` | Present in the Status inventory as implemented; route owner and synthetic/demo disclosure not inspected in this receipt. | INVENTORIED ONLY — NOT ACCEPTED |
| `/demo/replay-film` | Present in the Status inventory as implemented; route owner and certification-pending disclosure not inspected in this receipt. | INVENTORIED ONLY — NOT ACCEPTED |
| `/spatial/life-map` | Present in the Status inventory as implemented; route owner not inspected in this receipt. | INVENTORIED ONLY — NOT ACCEPTED |
| `/spatial/life-map-r3f` | Present in the Status inventory as implemented; route owner not inspected in this receipt. | INVENTORIED ONLY — NOT ACCEPTED |
| `/spatial/ar-vr` | Status source labels this preview and separately requires physical verification. Browser, permission, comfort, performance, input, lifecycle, accessibility, and physical-device evidence remain absent from this receipt. | INVENTORIED PREVIEW — NOT ACCEPTED |

## Privacy-copy escalation

The current `/privacy-controls` source contains user-facing statements whose safe publication depends on proof outside the page component. Until exact enforcement evidence exists, Workstream D does not approve these as unconditional guarantees:

- private by default;
- no hidden raw-data sharing;
- export and deletion controls visible;
- consent stays visible and reversible;
- models can only use approved context;
- human approval before real-world action;
- exact/private location behavior;
- export redaction and expiring links;
- protected legacy and relationship permissions.

Required owners must provide versioned consent-policy evidence, downstream deny tests, revocation propagation, export/deletion completion, audit events, provider-data boundaries, tenant isolation, live control interaction proof, and support/recovery procedures.

## Source-positive findings

The audit found useful foundations that should be preserved:

- explicit metadata exists for `/`, `/home`, `/ground`, `/life-map`, `/focus`, `/status`, and `/privacy-controls`;
- Focus and Replay define named loading surfaces;
- Replay includes semantic labels for playback controls and narrator panel plus a route fingerprint;
- Mirror provides purpose copy and visible route navigation;
- Status explicitly says source implementation is different from current deployment proof;
- Status keeps physical XR verification separate;
- Privacy Controls states that real-world actions remain human-led.

These are source strengths, not route acceptance receipts.

## Next execution order

1. Inspect the immediate owner component for each primary route and record exact user-visible purpose, actions, disclosures, and state branches.
2. Inspect supporting, account, profile, place, demo, legal, privacy, early-access, diagnostic, and error routes.
3. Create one stable route-state test fixture per route covering applicable loading, empty, offline, degraded, permission, destructive, and recovery states.
4. Hand implementation defects to the owning route/runtime workstream; do not hide them in documentation changes.
5. Run keyboard, screen-reader, reduced-motion, zoom, mobile, desktop, unsupported-browser, offline, missing-resource, and console checks at one unchanged candidate SHA.
6. Repeat the matrix against the exact deployed SHA and attach custom-domain evidence.

## Claim boundary

This matrix may support the statement that named route owners and some source content exist at the frozen SHA. It does not support saying that the routes are complete, production-ready, live, accessible, localized, privacy-enforced, provider-backed, clinically safe, or device-certified.
