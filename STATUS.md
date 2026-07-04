# URAI Spatial Status

Canonical status: active canonical public spatial application repository.

Runtime app root: `urai-tier1`.

Canonical public application: `LifeLoggerAI/urai-spatial/urai-tier1` on `main`.

Current mode: `fallback-demo` with a partially current live deployment.

Production-live status: not yet verified.

Latest audited release candidate: July 3, 2026. V1 has a 53-of-53 provider-marked asset handoff in source, but the configured release workflow, exact-commit deployment receipt, rollback reference, route parity, and post-deployment browser proof are not complete. V2 and V3 remain handoff-gated (`ready: 0`). V4 and V5 remain provider/browser/device/deployment gated.

## Current verified blockers

- The live custom domain serves current Home, Ground, Life Map, Replay, Mirror, Passport, Status, Ascent, and Unwind surfaces, but `/privacy-controls/` currently resolves to Home instead of the dedicated Privacy Controls source owner.
- Query and slash parity is not stable: `/focus/` and `/focus/?memoryId=quiet-reset` expose the current chamber, while `/focus?memoryId=quiet-reset` can expose a stale legacy shell.
- `firebase.static.json` contains a catch-all rewrite to `/index.html`, which can mask missing exported pages as successful Home responses.
- The canonical Firebase deployment workflow exports `FIREBASE_TOKEN` even when service-account mode is selected, allowing an expired token to override valid application-default credentials.
- No exact-current-main deployment receipt, rollback target, complete mobile/desktop screenshot set, or physical Quest proof is recorded.

## Authority

`urai-spatial` owns the canonical public immersive application at `https://urai.app`: spatial Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Privacy Controls, Location Map, Status, orb navigation, privacy-safe fallback UI, and gated AR/VR/WebXR expansion work.

Legacy repositories may support rollback or migration only and must not overwrite canonical production automatically.

Runtime work belongs under `urai-tier1` unless a future decision record explicitly changes the runtime root.

## Current shipped claim

Allowed claim:

> URAI Spatial is reachable as a privacy-safe fallback/demo spatial shell with a substantial V1 web experience and future provider seams.

Not allowed claim:

> URAI Spatial V1 through V5 is fully production-certified with active provider-backed V2/V3 assets, AR/WebXR hardware proof, autonomous real-world actions, wearable/body-signal providers, memory-grounded persistence, or complete live deployment evidence.

## Version posture

| Version | Source posture | Asset/runtime posture | Certification posture |
| --- | --- | --- | --- |
| V1 | Main route chain and production owners are present. | Provider handoff reports 53 ready, 0 missing. Live deployment is mixed/stale on at least Privacy Controls and Focus parity. | Not certified. |
| V2 | Living-state wiring, fallback inventory, gating, and verifier exist. | Canonical handoff reports 0 ready, 80 missing; V1 fallback remains active. | Not certified. |
| V3 | Relationship, shadow, pattern, consent-safe fallback surfaces and inventory exist. | Canonical handoff reports 0 ready, 39 missing. | Not certified. |
| V4 | WebXR/Quest runtime and lifecycle hardening exist in source. | Browser/provider/device proof remains gated. | Not certified; no physical Quest claim. |
| V5 | Mirror of Becoming, legacy, consent, provenance, and protected-presence concepts exist across source and fallback assets. | Canon explicitly keeps V5 production-gated pending implementation, privacy, tests, deploy, and live smoke. | Not certified. |

## Provider status

| Capability | Status | Rule before live claim |
| --- | --- | --- |
| V1 provider asset handoff | Source-ready | Requires current-main build, deploy receipt, live route/resource/browser proof, and rollback evidence. |
| V2 living-state assets | Not active | Requires provider forge receipt for 80 assets, zero-missing promoted handoff, runtime activation proof, deploy, and live browser proof. |
| V3 relationship/pattern assets | Not active | Requires provider forge receipt for 39 assets, privacy review, runtime activation proof, deploy, and live browser proof. |
| AR/WebXR | Not active | Requires browser/provider validation, permission-safe session proof, device matrix, consent review, E2E evidence, and live smoke. |
| Quest VR | Not device-certified | Requires physical headset run, controller/hand input, comfort/performance, session lifecycle, and recorded evidence. |
| Wearables/body signal | Not active | Requires provider contract, explicit consent, non-diagnostic copy review, privacy tests, fallback behavior, and live smoke. |
| Memory-grounded orb | Not active | Requires memory contract, consent gates, fallback behavior, deletion/export proof, and live smoke. |
| Asset Factory live jobs | V1 evidence present; V2/V3 not promoted | Requires provider receipts, approved promotion manifests, runtime activation, and cross-repository release evidence. |
| Firebase/Firestore persistence | Not proven live | Requires exact project, deployed rules/indexes, Auth configuration, owner/tenant tests, deployment receipt, and live smoke. |

## Done definition

`urai-spatial` is not production-certified until all applicable evidence is recorded:

- frozen dependency install
- source integrity and canonical runtime locks
- typecheck, unit, integration, privacy, accessibility, reduced-motion, and browser tests
- normal and static builds
- route exposure, slash/query parity, missing-resource, and console-error checks
- exact canonical `main` commit and previous rollback target
- Firebase deployment output from the canonical workflow
- custom-domain route and interaction smoke
- desktop and mobile screenshots
- provider-specific and device-specific evidence before those claims are enabled

## Copy boundary

All public copy must distinguish implemented fallback-safe behavior from provider-active, device-certified, or autonomously executed behavior. Route reachability or the presence of version-labelled assets is not sufficient certification.
