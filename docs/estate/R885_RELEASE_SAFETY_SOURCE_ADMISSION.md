# One UrAi Genesis — R885 protected release source admission

Date: 2026-11-07. Status: **PRODUCTION HOLD**. Branch: `review/chalk-r885-wif-release-safety-20261107`. Review-only, no deployment, main merge, cloud mutation, or approved production authorization.

## Exact lineage and scope

The R885 branch was created from Spatial controller draft PR #1636 at `4ae01987a0664266642faecad68a1eea0f5b881f`. The active Focus successor PR #2072 is separately owned and was **not edited**. The historical UrAiProd repository is not a release source.

Changed source:
- `scripts/urai-post-deploy-smoke.mjs`: R879 HTTP 500–599 no longer qualifies as a valid API denial / availability signal.
- `.github/workflows/spatial-governed-wif-deploy.yml`: R880 certified prior fingerprint refusal, R881 merged-main SHA and separate premerge/merged-main CI proof, R882 actual Hosting domain site collector / live-channel-only selection, R883 Functions build and Hosting artifact custody stages.
- `scripts/R882_PROVIDER_LIVE_SITE_COLLECTOR.py`: source-preserved standalone GET-only site/domain/live-channel collector.
- `scripts/R883_VERIFY_FUNCTIONS_BUILD.mjs`: source-preserved build-input / compiled-file identity tool.
- `scripts/R883_VERIFY_HOSTING_ARTIFACTS.mjs`: source-preserved pending and certified output-byte verifier.
- `scripts/r885-release-source-regression.test.mjs`: new six-case read-only workflow/source regression test.

## Intentional hard HOLD

The R885 source still lacks authenticated, revision-pinned proof of the **currently running and rollback target Cloud Functions / Cloud Run backend**, as well as true frontend-backend end-to-end parity. `Re-prove exact deployment boundary` explicitly emits `HOLD: protected backend revision and rollback equivalence not certified.` and exits **before the first production mutation**. Do not remove this stop merely because source checks, synthetic fixture tests or PR CI pass.

The current authenticated WIF identity in the underlying workflow is a **deployer service account**, not an independently proven least-privilege *read-only* identity. Although the R882 Python collector sends only fixed allowlisted GETs, this does **not** certify credential scope. Separate read-only provider collection and security review are required before release.

## Offline evidence and verification

The original R883 scripts and R882 collector were copied from their preserved R882/R883 forensic packages. Recovered local fixture suites were re-executed in this continuation:
- R883 Hosting custody: 25/25 PASS.
- R883 Functions build: 13/13 PASS.
- R882 collector: 30/30 PASS.
- R884 release auditor: 28/28 PASS.

These are `isolated_test_verified` on local original package files. They are **not** a native Spatial build, GitHub CI for the new head, protected Firebase/Functions runtime acceptance, or a physical-device test. New `r885-release-source-regression.test.mjs` is committed but **has not been run** against a full local checkout.

Read-only connected GitHub readback of the branch showed the submitted workflow includes the mandatory pre-production HOLD and each proposed safety component. That is `source_verified`, not a production certificate.

## Remaining review defects

1. Verify exact revised workflow YAML and regression suite on a real frozen exact-head checkout (Node 22 / pnpm 10 / Java 21 as appropriate). The external GitHub Actions executor may be unavailable and **no paid runner** has been dispatched.
2. Verify that the chosen merged-main workflow `urai-spatial-ci.yml` is the correct independently accepted full release gate; source identity and CI semantics require security-owner review.
3. Replace / further harden provider rollback with independently authenticated Hosting site and **complete paginated** live-channel history and backend revision/digest recovery proof. Automatic Functions source redeploy is **not** proof of exact rollback parity.
4. Establish owner-approved least-privilege read-only provider identity and map `urai.app` domain/site to immutable Hosting releases, Functions source/build inputs, deployed artifact/image digests and Cloud Run revisions.
5. Test protected signed positive consent, private memory → Jobs → Studio → Replay, owner isolation, forged-consent denial, revocation/deletion, browser/device/XR/accessibility and independent release approval.
6. Keep production deployment prohibited until all conditions are independently proven.

## No false GO

This PR is a **draft safety review**. It intentionally cannot release. No provider calls, billing operations, deployment, GitHub main merge, production authorization, or user's private media access occurred as part of R885.

The active controller owner and independent reviewer should reconcile this branch with current #1636, #2072, and all other workers' changes before any eventual admission.
