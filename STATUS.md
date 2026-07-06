# URAI Spatial Status

Canonical status: active canonical public spatial application repository.

Runtime app root: `urai-tier1`.

Canonical public application: `LifeLoggerAI/urai-spatial/urai-tier1` on `main`.

Current audited `main` SHA: `f55ad9f08a80d502c85538300907dcb7f1566212`.

Current mode: `fallback-demo` with a partially current live deployment.

Production-live status: not yet verified.

Latest source audit: July 6, 2026. V1 has a 53-of-53 provider-marked asset handoff in source, but the configured release workflow, exact-commit deployment receipt, rollback reference, route parity, and post-deployment browser proof are not complete. V2 through V5 remain provider, promotion, privacy, browser, device, or deployment gated according to their capability boundaries.

## Current verified blockers

- No exact-current-main deployment receipt, Firebase target receipt, rollback target, complete mobile/desktop screenshot set, or physical Quest proof is recorded.
- Current custom-domain parity for `/privacy-controls/`, `/focus/`, `/focus/?memoryId=quiet-reset`, and `/focus?memoryId=quiet-reset` has not been reverified from an external browser against the audited source SHA.
- The canonical deployment workflow requires a successful current-main `pnpm live:check` and an authorized deploy invocation before the public domain can be certified.
- Provider-backed version packs are not promoted: V2 requires 80 living-system outputs, V3 requires 14 relationship/pattern outputs, V4 requires 39 XR outputs, and V5 requires 27 becoming/legacy outputs.

## Source-fixed items awaiting live verification

- `urai-tier1/src/app/privacy-controls/page.tsx` is the dedicated Privacy Controls source owner with an explicit `URAI Privacy Controls` title and route fingerprint.
- `urai-tier1/src/app/focus/page.tsx` renders `FinalFocusChamber` with the canonical `focus-selected-memory-camera-chamber` fingerprint.
- `firebase.static.json` publishes `urai-tier1/out`, enables clean URLs and trailing slashes, and contains no rewrites; missing pages are no longer intentionally masked by a catch-all Home rewrite in current source.
- `.github/workflows/spatial-live-deploy.yml` uses a service-account JSON file through `GOOGLE_APPLICATION_CREDENTIALS`; the current workflow does not export the legacy token variable previously documented as a blocker.
- `scripts/check-production-route-exposure.mjs` enforces the two route owners and zero-rewrite static hosting posture on release checks.

These source fixes are **VERIFIED IN REPOSITORY**, not **VERIFIED LIVE**. They require a passing release run, deployment receipt, and external route proof before the live blockers can close.

## Authority

`urai-spatial` owns the canonical public immersive application at `https://urai.app`: spatial Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Privacy Controls, Location Map, Status, orb navigation, privacy-safe fallback UI, and gated AR/VR/WebXR expansion work.

Legacy repositories may support rollback or migration only and must not overwrite canonical production automatically.

Runtime work belongs under `urai-tier1` unless a future decision record explicitly changes the runtime root.

## Current shipped claim

Allowed claim:

> URAI Spatial is reachable as a privacy-safe fallback spatial shell with a substantial V1 web experience and future provider seams.

Not allowed claim:

> URAI Spatial V1 through V5 is fully production-certified with active provider-backed higher-version assets, AR/WebXR hardware proof, autonomous real-world actions, wearable/body-signal providers, memory-grounded persistence, or complete live deployment evidence.

## Version posture

| Version | Source posture | Asset/runtime posture | Certification posture |
| --- | --- | --- | --- |
| V1 | Main route chain and production owners are present. Privacy Controls, Focus ownership, and zero-rewrite static hosting are source-locked. | Canonical contract requires 53 Genesis outputs. Provider handoff reports 53 ready, 0 missing; current live parity and exact deployed SHA remain unverified. | Not certified. |
| V2 | Living-state wiring, fallback inventory, gating, and verifier exist. | Canonical contract requires 80 living-system outputs. Provider receipt, promotion and live wiring remain incomplete. | Not certified. |
| V3 | Relationship, shadow, pattern, consent-safe fallback surfaces and inventory exist. | Canonical contract requires 14 relationship, shadow and pattern outputs. Provider receipt, privacy/provenance review, promotion and live wiring remain incomplete. | Not certified. |
| V4 | WebXR/Quest runtime and lifecycle hardening exist in source. | Canonical contract requires 39 WebXR, AR and VR outputs; browser/provider/device proof remains gated. | Not certified; no physical Quest claim. |
| V5 | Mirror of Becoming, legacy, consent, provenance, and protected-presence concepts exist across source and fallback assets. | Canonical contract requires 27 becoming, legacy and protected-presence outputs; implementation, privacy, promotion, deploy and live smoke remain gated. | Not certified. |

## Provider status

| Capability | Status | Rule before live claim |
| --- | --- | --- |
| V1 provider asset handoff | Source-ready | Requires current-main build, deploy receipt, live route/resource/browser proof, and rollback evidence. |
| V2 living-state assets | Not active | Requires provider forge receipt for 80 outputs, zero-missing promoted handoff, runtime activation proof, deploy, and live browser proof. |
| V3 relationship/pattern assets | Not active | Requires provider forge receipt for 14 outputs, privacy/provenance review, runtime activation proof, deploy, and live browser proof. |
| V4 XR assets and runtime | Not active or device-certified | Requires provider forge receipt for 39 outputs, browser permission-safe session proof, device matrix, comfort/performance evidence, deploy, and live smoke. |
| V5 becoming/legacy assets | Not active | Requires provider forge receipt for 27 outputs, identity/provenance/privacy review, runtime activation proof, deploy, and live browser proof. |
| Quest VR | Not device-certified | Requires physical headset run, controller/hand input, comfort/performance, session lifecycle, and recorded evidence. |
| Wearables/body signal | Not active | Requires provider contract, explicit consent, non-diagnostic copy review, privacy tests, fallback behavior, and live smoke. |
| Memory-grounded orb | Not active | Requires memory contract, consent gates, fallback behavior, deletion/export proof, and live smoke. |
| Asset Factory live jobs | V1 source evidence present; V2-V5 not promoted | Requires canonical contract, explicit paid authorization, capped provider receipts, approved promotion manifests, runtime activation, and cross-repository release evidence. |
| Firebase/Firestore persistence | Not proven live | Requires exact project, deployed rules/indexes, Auth configuration, owner/tenant tests, deployment receipt, and live smoke. |

## Done definition

`urai-spatial` is not production-certified until all applicable evidence is recorded:

- frozen dependency install;
- source integrity and canonical runtime locks;
- typecheck, unit, integration, privacy, accessibility, reduced-motion, and browser tests;
- normal and static builds;
- route exposure, slash/query parity, missing-resource, and console-error checks;
- exact canonical `main` commit and previous rollback target;
- Firebase deployment output from the canonical workflow;
- custom-domain route and interaction smoke;
- desktop and mobile screenshots;
- provider-specific and device-specific evidence before those claims are enabled.

## Copy boundary

All public copy must distinguish implemented fallback-safe behavior from provider-active, device-certified, or autonomously executed behavior. Route reachability or the presence of version-labelled assets is not sufficient certification.
