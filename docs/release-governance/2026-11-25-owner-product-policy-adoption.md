# Owner adoption of limited product-acceptance policy

Date: November 25, 2026
Decision-maker: Adam Clamp (project owner)
Decision: ADOPT LIMITED OWNER PRODUCT-ACCEPTANCE POLICY
Source: explicit owner reply in the Codex project conversation:
"Adopt that limited owner-approval policy"

Scope: Adam Clamp may record acceptance of Spatial usability and appearance under his own identity. This replaces the independent product judgment for those two subjects only. It does not replace independent privacy, security or legal review or any technical release gate.

This is adoption of a policy, not acceptance of a product build. No reviewed candidate SHA, product decision, completed attestation or signature has been supplied. Earlier usability feedback on the historical preview is not transferred to a later candidate.

## Implementation boundary

scripts/owner-product-acceptance.mjs validates the structure and source/policy/PR binding of an owner product-acceptance object and checks the SHA-256 of supplied attestation bytes. Its caller must supply independently obtained expected source SHA, PR number and effective policy revision. Never derive that expected context from the untrusted record itself.

This is a reusable evidence validator, not a signature verifier or active release authorization path. A valid structure always returns identityAuthenticated=false, independentApproval=false and productionAuthorized=false. Authenticating and retaining the owner's actual decision remains a separate integration requirement; a hash is not a signature.

The module only accepts usability and appearance scopes. Privacy/security/legal scopes, production authorization claims and independent-review fields are rejected. NOT APPROVED remains a negative decision.

Run validation tests with:
node --test scripts/owner-product-acceptance.test.mjs

## Remaining integration work

- Authenticate the actual owner product decision, bind it to the exact candidate and adopted policy revision, and retain its evidence.
- Add a separate owner-product-acceptance section to release receipts. Do not populate independentApprovedReviewer or INDEPENDENT_* from an owner decision.
- Keep the release governance workflow's independent approval requirement for the remaining independent release responsibilities. Its broader approval currently cannot be safely relabeled as product-only.
- Production authorization records require independentApproval; the strict Life Model receipt also requires independentApproval=APPROVED. These fields remain independent release obligations, not owner product decisions.
- Android signing and production deployment continue to require their existing distinct authorization and evidence.
- Preserve the August 4 governance incident record and historical reviewer trust anchors without rewriting prior facts.
- Cross-repository policy requirements are unchanged.

## Verification

22 local Node tests passed for structure, source/policy/PR mismatch, changed attestation, negative decisions, scope restrictions, unknown fields and non-authorization invariants. These tests use synthetic fixtures. No real approval was generated. Hosted and protected CI validation remain outstanding.

The policy decision is recorded on this branch. Until the change is reviewed and integrated, canonical main remains unchanged.
