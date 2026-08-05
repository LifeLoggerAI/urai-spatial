# URAI Spatial release-governance incident — 2026-08-04

## Classification

`MERGED SOURCE NOT PRODUCTION-AUTHORIZED — GOVERNANCE CLEANUP AND FRESH MERGED-MAIN PROOF REQUIRED`

## Affected authorities

- Product PR #1037 merged as `869eb1df8d75351d046a22e82a85a100389d6a82` at `2026-08-04T23:36:19Z`.
- Temporary dispatcher PR #1036 merged as `64b2070b0dbb66db57f2493119ed6568efac9d46` at `2026-08-04T23:37:07Z`.
- Cleanup PR #1038 merged as `62d77f7d406e78cbfcefad73ca31247f90a377be` from exact head `9d20b7b4176d5ef7a824d243b84ea17eb2849cd7`.
- GitHub records zero eligible non-author submitted reviews on PR #1038. The missing pre-merge approval is a governance exception and must not be backfilled, fabricated, or represented as having existed.
- PR #1038 removed only `.github/workflows/dispatch-frozen-full-preview.yml`; the dispatcher is absent from canonical `main`.
- Corrective governance PR #1039 was technically certified at exact head `32e6e5edf81d6567600e85f5a7d471016a2c8388` with 19 successful workflows, zero failed, and zero pending.
- PR #1039 then merged externally as `aa2fa1883f6627f4da872a3e80bd8ae125e98f82` while GitHub still recorded zero eligible non-author `APPROVED` reviews. This is a second governance exception and must not be backfilled, fabricated, or represented as having existed.
- The source introduced by #1039 is retained on `main`, but the merge itself does not authorize production and does not satisfy the independent-review requirement.

## Evidence limits

The connected repository actions do not expose complete historical branch-protection, ruleset, required-check, environment-reviewer, or bypass snapshots at the instant of the earlier merges. Those states remain `evidence not found` rather than inferred.

Controlling missing release evidence includes:

- Founder decision: evidence not found.
- Home visual acceptance: evidence not found.
- Independent approval: evidence not found.
- Provider acceptance for merged main: evidence not found.
- Provider production identity: evidence not found.
- Rollback authority: evidence not found.

## Dispatcher containment

The temporary dispatcher was diagnostic-only and was not valid permanent release authority. PR #1038 removed it from canonical `main`. Its historical receipt cannot certify current product authority or production state.

## Permanent corrective controls

- `.github/CODEOWNERS` identifies release-governance ownership for workflows, release-governance records, and release evidence, but repository ownership labels alone do not prove that an eligible reviewer exists.
- `.github/workflows/release-governance-guard.yml` rejects the temporary dispatcher path and temporary or diagnostic dispatcher markers from canonical workflows while excluding its own policy text from marker scanning.
- The guard requires exact-head checkout, clean-tree proof, exact-SHA binding for changed release and deployment workflows, fail-closed production-authorization validation, and retained evidence receipts.
- The guard now requires an exact-head `APPROVED` review from a non-author collaborator whose current repository permission is `write`, `maintain`, or `admin`.
- The review gate re-runs on submitted, edited, or dismissed pull-request reviews and fails closed when no eligible exact-head approval exists.
- Production authorization records under `evidence/release/**` cannot claim authorization without exact merged-main SHA, provider project, provider site, provider version, preview URL, explicit `APPROVE HOME`, independent approval, rollback target, and `productionTargeted=true`.
- The guard requires this incident record and verifies both governance-exception merges: `62d77f7d406e78cbfcefad73ca31247f90a377be` and `aa2fa1883f6627f4da872a3e80bd8ae125e98f82`.

## Remaining corrective sequence

1. Certify the follow-up governance enforcement PR on an unchanged exact head.
2. Add or restore a genuine non-author collaborator with `write`, `maintain`, or `admin` permission.
3. Obtain that collaborator's formal exact-head `APPROVED` review.
4. Merge the enforcement PR only with expected-head protection.
5. Rebase and repair PR #1040 onto the resulting governed `main`.
6. Produce fresh exact-head workflow, visual, accessibility, fallback, console, network, performance, privacy, fingerprint, and rollback evidence.
7. Record Adam's explicit visual acceptance on the unchanged final #1040 head.
8. Obtain genuine eligible non-author approval on the same #1040 head.
9. Merge #1040 with expected-head protection and freeze resulting `main`.
10. Close credential, domain, DNS, TLS, Firebase mapping, and rollback gates before protected deployment.

## Historical integrity

Do not delete, rewrite, conceal, or retroactively approve the historical PRs, commits, workflow records, comments, or artifacts. They remain evidence of the incident and its correction.

Repository checks, merge completion, preview upload, or provider deployment do not alone constitute production authorization.
