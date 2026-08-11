# URAI Spatial Release Evidence

This file is the current repository evidence authority for URAI Spatial. Historical SHA-bound evidence remains available in Git history, workflow artifacts, release receipts, and the existing Drive execution receipts; it must not be transferred to a newer candidate.

## Current release authority — 2026-08-08

- Runtime app root: `urai-tier1`.
- Controlling release lane: PR #1069, `agent/real-world-home-production-completion-20260808`.
- Controlling product gate: GitHub issue #863.
- Production-live status: **not verified**.
- Candidate evidence rule: resolve the live PR head before using any CI, proof, visual acceptance, governance authorization, or receipt as current.
- Preview deployments and PR verification runs are not production deployments.

## Canonical asset evidence

Repository-governed receipts currently establish the following asset facts independently of production deployment:

| Evidence | Current recorded fact |
| --- | --- |
| Retained V1-V5 runtime images | 213 ready / 0 missing |
| V1 | 53 ready / 0 missing |
| V2 | 80 ready / 0 missing; 71 generated replacements + 9 preserved certified sources |
| V3 | 14 ready / 0 missing |
| V4 | 39 ready / 0 missing |
| V5 | 27 ready / 0 missing |
| Launch-critical models | 7 promoted / 0 pending |
| Paid V2-V5 generation | 151 generated / 151 passed / 0 failed |
| Paid promotion decision | `promotionAuthorized: true` |
| Paid deployment decision | `deploymentAuthorized: false` in the paid-generation receipt; deployment remains controlled by the repository release workflow |

Canonical files:

- `docs/release-evidence/SPATIAL_ASSET_COMPLETION_LEDGER_2026-08-01.json`
- `docs/release-evidence/URAI-SPATIAL-20260730-V2-V5-EXACT-PAID-PROMOTION.json`

Do not regenerate accepted paid assets merely because older status text said they were missing. Asset availability does not itself certify provider runtime behavior, privacy, XR/device support, or a production deployment.

## Production spatial audio evidence

The production audio lane is not complete until the canonical forge has generated, verified, and committed the eight production Opus assets plus `operations/assets/production-receipts/spatial-audio-production-v1.json`.

Required assets:

- `home-ambient-v1.opus`
- `ground-ambient-v1.opus`
- `life-map-ambient-v1.opus`
- `focus-ambient-v1.opus`
- `replay-ambient-v1.opus`
- `portal-transition-v1.opus`
- `orb-confirm-v1.opus`
- `ui-error-v1.opus`

The final receipt must remain exact-forge-input-head bound, pass codec/channel/loudness/true-peak/duration checks, contain exactly eight assets, and explicitly prove that the historical eight-second WAV proof bed was not promoted. If the forge commits outputs back to the PR branch, that successor commit becomes the new candidate and older exact-head evidence is stale.

## Exact-head release gates

The genuinely frozen candidate must satisfy every applicable repository-required gate on that same SHA, including the current equivalents of spatial CI/verify, production verification, release security/governance, accessibility/performance/reduced motion, mobile/touch/keyboard/pointer, Guardian/XR/privacy, asset governance/ledger, production audio, Home/continuous/Orb proof, previews, automated receipt ledger, release readiness, copy/policy, export/source, and any newer branch-protection-required check.

A repository-defined skip is acceptable only when the workflow's own conditions legitimately make the gate inapplicable. Queued, pending, cancelled, or skipped-without-applicable-condition is not a pass.

## Visual evidence boundary

Issue #863 cannot close from telemetry or green automation alone. Fresh exact-head rendered evidence must be directly inspected for:

- desktop Home;
- portrait mobile Home;
- movement/traversal and near-Orb state;
- Ground environmental descent;
- Life Map environmental ascent;
- reduced-motion presentation where separately rendered;
- the canonical preview/public runtime used for acceptance.

The visual result must show one coherent geometry-owned 3D Home; consistent desktop/mobile world composition; readable lighting/depth; real spatial movement; no rejected forge-era/low-poly scenery or mannequin sculpture; a physically integrated subordinate Orb; natural Ground/Life Map transitions; no visible debug/demo/placeholder copy; valid privacy-preserving first-person embodiment; and no hidden runtime/network/render failure that invalidates the proof.

## Human and governance boundary

No founder/steward visual approval is inferred from continuation instructions. Human approval must bind to the exact frozen SHA after non-human gates and direct visual inspection are ready. Any later source commit invalidates it.

Release Governance Guard must then pass on the same SHA using the repository-prescribed review or exact-head solo-steward mechanism. Branch protection and governance tests must not be weakened.

## Canonical production deployment contract

There is currently no repository production deployment authority. `.github/workflows/spatial-live-deploy.yml` is verification-only and records **NO-GO**; it accepts no release/rollback/confirmation input, receives no production credential, and cannot execute Firebase mutation. The full and Location Map preview workflows are likewise local-only verification.

A future production authority must be introduced only by a separately reviewed exact-head change after provider-side external-account WIF trust, least-privilege IAM, historical-key revocation, negative-auth, audit-log review, protected settings/read-back, and eligible non-author approval are recorded. Do not substitute an ad-hoc Firebase deploy.

## Production verification evidence

After a future separately authorized keyless deployment succeeds, production is still not complete until independent live verification records the shipped SHA and verifies at minimum:

- `https://urai.app` responds successfully;
- `/home`, Ground transition, Life Map transition, and Orb interaction work;
- desktop and portrait mobile work;
- touch and keyboard/pointer navigation work;
- reduced motion remains valid;
- critical models/images/audio load without failed critical requests;
- no obvious console/runtime errors invalidate the result;
- production audio honors consent/mute requirements;
- privacy controls remain intact;
- rollback SHA is recorded and viable.

## Current release decision

**NO production completion claim.** Source verification, provider closure, independent approval, and a separately reviewed keyless release authority remain required before merge/deployment/live verification, final Drive receipt update, or issue #863 closure.
