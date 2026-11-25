# Proposed owner approval mode

Status: OWNER ADOPTED LIMITED POLICY — INTEGRATION PENDING. Prepared November 25, 2026 at Adam Clamp's request. See ../2026-11-25-owner-product-policy-adoption.md for the explicit owner decision and implementation limits.
This document is a policy proposal, not a release decision, signature, waiver, or change to executable gates.

## Problem and proposed decision

The registered independent reviewer's original signing key has not been recovered. The owner requested an alternative that can use owner-controlled infrastructure. Hosting a signing key on Runpod does not make the owner an independent reviewer.

Proposed policy: permit Adam Clamp to provide an explicitly identified owner approval for Spatial product usability and visual acceptance in place of the Spatial independent product-review decision, only after this policy is separately adopted by the authority responsible for release governance. This deliberately reduces separation of duties for that product decision. It must never be described as independent review or attributed to LimberNutz0.

This proposal does not replace independent privacy, security or legal approvals required by Privacy or other components. It does not approve private render consent issuance, data deletion, provider retention disposition, CI equivalence, Android publication, production deployment, or rollback acceptance.

## Existing enforcement and adoption boundary

The release-governance-guard.yml workflow currently excludes PR-author approvals and explicitly removed the legacy solo-steward fallback. android-governed-signing-prep.yml separately verifies independent exact-head approval. spatial-governed-wif-deploy.yml also consumes governed release evidence. Changing only a PR label, public key, or document cannot activate this proposal.

An authorized governance decision must identify its decision-maker, date, exact policy revision, scope and rationale. This document does not assert who may waive an existing organizational or legal requirement. It must not use its own proposed owner-only mode to satisfy its adoption requirements.

After adoption, a separate implementation must update affected consumers consistently. Android signing remains subject to its current independent requirement unless a separately scoped decision addresses it. The historical LimberNutz0 trust anchor and evidence remain attributable to LimberNutz0.

## Proposed owner evidence contract

Use a distinct owner record; never put owner credentials in INDEPENDENT_* fields.

Required fields:
- approval_mode: owner-product-acceptance-v1
- owner_identity: Adam Clamp
- repository, PR number, exact 40-character source SHA
- decision: APPROVED or NOT APPROVED, entered after review
- scope: explicit product acceptance scope
- reviewed_at: timestamp with timezone
- policy_revision: exact adopted policy commit
- attestation_sha256 and retained attestation location
- limitations and unresolved gates
- owner public-key fingerprint and signature reference, if cryptographic signing is selected

Use a separate canonical message version and SSHSIG namespace, urai-owner-product-acceptance. Never reuse the independent-release namespace or infer approval from possession of a key. Keys authenticate a statement, not the truth of its claims.

An owner-operated Runpod signing arrangement is technically possible but requires a deliberate custody, access, backup and revocation choice. Do not place passphrases in commands, environment variables, logs or repository files. No owner key is created or registered by this proposal.

## Required implementation verification after adoption

Reject wrong source SHA, repository, PR, identity, namespace, policy revision, missing fields, duplicate fields, invalid signatures, tampered attestations and stale decisions. Reject owner records in independent approval fields. Preserve outstanding changes-requested decisions according to the adopted policy. Source changes invalidate source-specific acceptance.

Record approval mode accurately in every receipt and UI. Owner-product acceptance must not satisfy privacy/legal/security checks or silently authorize Android signing. A valid owner signature with any other failed release gate must still leave production blocked.

## Current release disposition

No approval recorded. Spatial candidate PR #2214 at 9f023c92a31f3bf27ca2d833debcd58f8d87b0d4 is an implementation reference, not an approved release.

Remaining requirements include approved scoped render authority and immutable source-to-render binding; terminal downstream deletion and ownership/retention coverage; qualifying CI; source-bound hosted/device acceptance; applicable privacy/security/legal approvals; and rollback evidence. The existing older preview cannot establish acceptance of this exact candidate.

## Review record — intentionally incomplete

Governance decision-maker:
Decision and date:
Adopted scope:
Exact adopted policy revision:
Required independent approvals retained:
Implementation PR and verification evidence:

Until the policy is adopted and implemented, current gates remain authoritative.
