# One UrAi Genesis — R886 exact-source release safety continuation

Date: 2026-11-07. Status: **PRODUCTION HOLD**. This document belongs to the same **draft** review-only release safety PR #2073, based on the canonical Spatial controller #1636 at `4ae01987a0664266642faecad68a1eea0f5b881f`. No deployment, service configuration, billing, or main-branch merge was performed.

## Real source corrections
1. `scripts/R883_VERIFY_FUNCTIONS_BUILD.mjs` now binds `packages/tier-locks/package.json` as an immutable Git blob and includes that file in the pre-attestation tracked-source integrity checks. This closes a package-metadata gap alongside the existing Tier Locks TypeScript tree check. GitHub blob `6610cdccf4d2019ae4730ac663ea5d2317e47876`, independently matched to the locally executed code.
2. `.github/workflows/spatial-governed-wif-deploy.yml` now uses the R882 authenticated site/domain/live-channel collector after a proposed Hosting rollback, verifies exact selected Hosting site and prior version against the complete paginated live-channel history, and refuses ambiguous results. This replaces the former `pageSize=100` first-page-only rollback readback, which was not a complete live history proof.
3. `scripts/r885-release-source-regression.test.mjs` was adjusted to require the actual paginated collector in the rollback path instead of merely looking for the literal REST endpoint.
4. `scripts/r886-functions-input-closure.test.mjs` adds **three** authentic temporary-Git-fixture cases for attestation, dirty Tier Locks package metadata and changed committed metadata that does not modify the Functions source tree.
5. `.github/workflows/urai-spatial-ci.yml` now invokes both the R885 source contract tests and the R886 Functions closure tests in each of its two existing CI jobs.

## Evidence: clearly scoped
- The original R882 collector's synthetic suite: **30/30 PASS**, locally rerun.
- The original R883 Hosting custody synthetic suite: **25/25 PASS**, locally rerun.
- R884 offline release auditor suite: **28/28 PASS**, locally rerun.
- Extended R883 Functions suite with Tier Locks package metadata test: **14/14 PASS**, locally run on the exact modified verifier blob.
- R886 new three-case Git fixture suite: **3/3 PASS** locally; the exact local test Git blob `d16f1899dba925b8d3f4aa80d0cda37cec53f8fa` matches the GitHub readback.
- These are **offline tests**. No full clean Spatial checkout, native build, Github Actions CI for R886 head, live Firebase version readback, Cloud Functions/Cloud Run image digest, owner-authenticated private-memory lifecycle, or physical-device acceptance was run.

## New R886 outstanding P0: build/post-attestation mutation boundary

Inspected immutable `firebase.json` blob `340145f0a234fca558a22284d08bbdf6d4af3a10` contains a Functions predeploy hook:
`node scripts/check-spatial-export-deployment-boundary.mjs` and `pnpm --filter urai-functions build`.

The R885 workflow's Functions compiled-file attestation and `--mode verify` occur **before** invoking Firebase CLI's `deploy --only functions --config firebase.json`. That CLI then runs its own predeploy build. Thus the attested compiled bytes are **not necessarily** the precise bytes that the provider ultimately packages, even if the source SHA remains fixed. No cross-artifact final deploy identity can be claimed until the provider's build/package input is frozen and verified *after any Firebase predeploy hook* and correlated to the actual deployed Functions and Cloud Run revision and image digests.

**Do not remove the existing mandatory pre-mutation `exit 1`**. It currently protects against this and all other unsatisfied backend revision / rollback equivalence gates. Repair design requires preserving semantics of the original predeploy boundary script and securely proving exactly what CLI ultimately uploads, not simply skipping the hook or assuming deterministic recompilation.

## Remaining release HOLD
The workflow still uses a WIF **deployer** token for provider evidence collection; a GET-only collector does not establish least-privilege credential scope. A separate authorized read-only provider identity, full domain/site authentication, Hosting and deployed backend revision-digest proof, rollback correctness, exact merged-main native CI, positive signed C6 owner consent, protected memory → Jobs → Studio → Replay → deletion, accessibility, device/XR and independent release review remain outstanding.

The source reviews and Git-fixture tests protect changes but cannot certify an integrated production system. Preserve PR #1636 and the separate Focus PR #2072; reconcile without overwriting other workers.
