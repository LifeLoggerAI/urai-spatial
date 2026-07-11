# URAI-WSD-20260711-BASELINE-001

## Receipt identity

| Field | Value |
| --- | --- |
| Receipt ID | `URAI-WSD-20260711-BASELINE-001` |
| Workstream | Parallel Workstream D — Product Readiness and Launch Operations |
| Evidence date | 2026-07-11 |
| Repository | `LifeLoggerAI/urai-spatial` |
| Canonical base | `main@60730edcb5bcedfe2ded2cee9a96cef96dff9510` |
| Work branch | `ws-d/docs-product-readiness-20260711` |
| Receipt commit | The Git commit containing this file; verify from the pull-request exact head. |
| Status | `REFRESHED ON CURRENT MAIN — EXACT-HEAD CHECKS PENDING` |

## Scope completed

This receipt proves only that the collision-checked Workstream D documentation baseline was rebuilt from the recorded canonical base with the current asset-intake boundary reflected in its claim language.

Governed artifacts:

| Path | Git blob SHA | Purpose |
| --- | --- | --- |
| `docs/product-readiness/COORDINATION_BASELINE.md` | `cf143b5b6f63c54433792b4af2d5614b01320cf6` | Defines authority, collision boundaries, the V1 intake limitation, current verdict, acceptance lanes, and handoff rules. |
| `docs/product-readiness/CANONICAL_GLOSSARY.md` | `2d4993ae349b4cb907da1a8300cdf163de286e1c` | Defines evidence-bounded launch terminology and prohibits inferring completed V1 delivery from an intake contract. |
| `docs/product-readiness/receipts/URAI-WSD-20260711-BASELINE-001.md` | Self | Records this bounded ancestry and evidence refresh. |

## Evidence read before mutation

- Current `main` resolved to `60730edcb5bcedfe2ded2cee9a96cef96dff9510` immediately before the rebuild.
- The two commits after the prior frozen base add a read-only V1 handoff intake workflow/contract/verifier and bind the contract to a safe-resume marker; they do not add the 53 output files or prove promotion/activation.
- Spatial issues #413 and #414 remain the canonical program and production-truth ledgers.
- Spatial PR #539 remains draft at head `f62e2ff5860e107f180715377a7cd87605898ade`; its own base metadata is stale and it is not merge-clean.
- Spatial PR #544 remains draft at head `7896f75c340f2ea3e046529eb2ea6c55255b7231` and targets the active #541 sensory branch.
- `LifeLoggerAI/urai-admin#45` was retained as the registry authority referenced by the prior baseline.
- `LifeLoggerAI/urai-content#67` was retained as the governed-content authority referenced by the prior baseline.
- Draft PR #546 and its three governed files were re-read before rebuilding.
- The Drive **URAI Document Authority Register and Mixed-Era Decision Record — 2026-07-10**, **URAI System Architecture Spec v1**, and Launch Control workbook remain supporting authority records.

## Collision verification

The governed paths remain limited to three files below `docs/product-readiness/`. Current-main changes are confined to the V1 asset-intake workflow, contract, and verifier. No file collision exists with Spatial PRs #539 or #544, or with the referenced Admin and Content authorities.

## Claims supported by this receipt

- A Workstream D baseline exists on top of the stated current `main` SHA.
- The baseline and glossary explicitly distinguish a V1 intake contract from generated, certified, copied, registered, promoted, activated, deployed, or paid-for assets.
- The persisted documentation states `PRODUCT NOT READY FOR PUBLIC LAUNCH` and preserves the repository's `fallback-demo` claim boundary.
- No competing canonical issue, completion ledger, registry, release authority, deployment receipt, provider receipt, or asset-certification receipt was created.

## Claims not supported by this receipt

This receipt does **not** prove:

- route-content acceptance or complete route behavior;
- onboarding, authentication, consent enforcement, persistence, export, deletion, or revocation;
- analytics safety, localization support, accessibility certification, metadata correctness, support readiness, or legal approval;
- generation, availability, duplication review, copying, registration, promotion, activation, deployment, or spend for the 53 contracted V1 assets;
- passing CI, merge approval, deployment, rollback, custom-domain parity, provider activation, paid calls, Firebase state, staging state, or physical-device/XR certification;
- public-launch readiness.

## Mutations performed

- Created an isolated temporary rebuild branch from `main@60730edcb5bcedfe2ded2cee9a96cef96dff9510`.
- Added only the three governed documentation files listed in this receipt.
- The existing PR branch may be moved to the verified rebuild commit only after an exact compare proves the three-file scope and zero-behind ancestry.

No application code, workflow, runtime, asset, manifest, provider, analytics, localization, Firebase, secret, database, Gmail, Drive, billing, deployment, rollback, or external-publication mutation was performed by this rebuild.

## Required next verification

1. Compare the rebuilt exact head against `main@60730edcb5bcedfe2ded2cee9a96cef96dff9510`.
2. Confirm zero commits behind and exactly the three governed `docs/product-readiness/` files.
3. Move the existing #546 branch only after that proof and record the new exact head.
4. Treat all previous #546 workflow evidence as stale and require a complete new exact-head run.
5. Obtain independent review of authority language, intake limitations, claim boundaries, and collision assumptions.
6. Refresh active heads again before rebuilding child PR #547.
