# URAI Spatial Status

Canonical status: active spatial interface repository.

Runtime app root: `urai-tier1`.

Main URAI product app: `LifeLoggerAI/UrAi`.

Current mode: `fallback-demo`.

Production-live status: not yet verified.

## Authority

`urai-spatial` owns the immersive spatial interface layer for URAI: spatial home, LifeMap, spatial shell routes, orb companion navigation surfaces, privacy-safe fallback UI, replay surfaces, and future AR, VR, and WebXR expansion work.

This repository is not the main URAI app, company website, marketing site, jobs product, analytics product, admin console, studio source of truth, or generic staging mirror.

Runtime work belongs under `urai-tier1` unless a future decision record explicitly changes the runtime root.

## Current shipped claim

Allowed claim:

> URAI Spatial runs as a privacy-safe fallback/demo spatial shell with future provider seams.

Not allowed claim:

> URAI Spatial is production-live with active AR/WebXR, wearable, body-signal, memory-grounded, paid entitlement, or cross-device persistence providers.

## Provider status

| Capability | Status | Rule before live claim |
| --- | --- | --- |
| AR/WebXR | Not active | Requires provider wiring, device validation, consent review, E2E evidence, and live smoke. |
| Wearables | Not active | Requires provider contract, explicit consent, privacy review, fallback behavior, and live smoke. |
| Body-signal provider | Not active | Requires explicit consent, non-diagnostic copy review, provider tests, privacy review, and live smoke. |
| Memory-grounded orb | Not active | Requires main URAI memory contract, consent gates, fallback behavior, and live smoke. |
| Asset Factory live jobs | Not active | Requires asset manifest contract, job handoff contract, provider smoke, and copy review. |
| Cross-repo memory sync | Not active | Requires main URAI integration contract, privacy review, deletion/export behavior, and live smoke. |
| Stripe paid entitlement | Conditional code present | Requires configured products/prices, webhook signing configuration, test payment, Firestore entitlement write, and unlock smoke. |
| Firebase/Firestore live persistence | Not proven live | Requires selected Firebase project, deployed rules/indexes, Auth configuration, owner/tenant rules tests, and live smoke. |

## Status labels

Use these labels consistently:

- `fallback-demo`: routes and APIs are allowed to run with deterministic privacy-safe fallback behavior.
- `local-verified`: install, typecheck, build, local smoke, E2E, and `pnpm launch:check` have passed and are recorded in `EVIDENCE.md`.
- `release-verified`: `pnpm live:check` has passed and is recorded in `EVIDENCE.md`.
- `live-fallback-verified`: deployment and live smoke have passed, but live providers remain deferred.
- `live-provider-verified`: a specific provider has passed provider wiring, consent, deployment configuration, tests, deploy, copy review, and live smoke.

## Done definition

`urai-spatial` is not production-live until all applicable evidence is recorded:

- `pnpm install`
- `pnpm check:spatial`
- `pnpm typecheck`
- `pnpm build`
- local smoke
- E2E lock checks
- `pnpm launch:check`
- `pnpm live:check`
- deploy command and commit SHA
- live smoke against the deployed host
- Firebase/Auth/Firestore provider evidence where live persistence is enabled
- Stripe evidence where paid entitlements are enabled
- provider-specific evidence before any live provider claim

## Copy boundary

All public copy must clearly distinguish fallback/demo capability from future provider seams. Do not imply live body-signal, wearable, AR/WebXR, memory-grounded, Asset Factory, Stripe, or cross-device persistence behavior until the matching provider row in `PROVIDER_MATRIX.md` is verified.
