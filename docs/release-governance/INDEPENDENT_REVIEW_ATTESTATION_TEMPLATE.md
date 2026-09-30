# URAI Independent Human Exact-Head Release Review

Review classification: Independent Human Release Approval

Reviewer identity: LimberNutz0

Founder / witness: Adam Clamp

Repository: LifeLoggerAI/urai-spatial

Release PR: [FINAL_PR_NUMBER]

Exact reviewed SHA: [FINAL_40_CHARACTER_SHA]

Review date/time: [ISO_8601_TIMESTAMP_WITH_TIMEZONE]

## Review declaration

I, LimberNutz0, confirm that I independently reviewed the UrAi release candidate identified by the exact SHA above.

My review applies only to this exact SHA and the evidence associated with it. It does not automatically transfer to a later commit, branch head, merge commit, deployment, or modified release candidate.

I was provided sufficient access to inspect the release candidate and its relevant evidence without being required to hold permanent write access to the private GitHub repository.

I understand that this review provides an independent human release judgment separate from the founder's own acceptance.

## Material reviewed

- core UrAi journey
- Home
- Ground / Ascent
- Life Map
- Focus
- Replay
- Mirror
- Passport
- privacy and consent controls
- accessibility behavior
- reduced-motion / low-stimulation behavior
- Captured Reality
- Life Movies and media behavior where included in launch
- Android release evidence
- security/privacy evidence
- release-gate results
- visual proof
- known limitations and documented launch boundaries

## Review result

Decision: [APPROVED or NOT APPROVED]

If APPROVED, I find the exact release candidate identified above acceptable for progression through the governed UrAi release process, subject only to explicitly documented post-review deployment, provider, physical-device, legal, or production-verification gates that remain separate from this human review.

This approval does not assert that unperformed production, provider, legal, physical-device, or deployment tests have occurred.

## Independence statement

I am providing this judgment as an independent human reviewer and not as the author granting self-approval to my own work.

Reviewer: LimberNutz0

Signature: ______________________________

Date/time: _____________________________

Witness: Adam Clamp

Witness signature: ______________________

Date/time: _____________________________

## Machine-verifiable approval metadata

After the reviewer has independently decided, complete the signed attestation, compute its SHA-256, and retain it at the evidence location referenced below.

The PR body must then contain exactly one line for each required field:

```text
INDEPENDENT_REVIEWER_ID=LimberNutz0
INDEPENDENT_APPROVED_SHA=[FINAL_40_CHARACTER_SHA]
INDEPENDENT_DECISION=APPROVED
INDEPENDENT_REVIEWED_AT=[ISO_8601_TIMESTAMP_WITH_TIMEZONE]
INDEPENDENT_ATTESTATION_SHA256=[64_HEX_SHA256_OF_SIGNED_ATTESTATION]
INDEPENDENT_ATTESTATION_URI=[RETAINED_EVIDENCE_LOCATION]
INDEPENDENT_WITNESS=Adam Clamp
INDEPENDENT_SSHSIG_B64=[BASE64_OPENSSH_SSHSIG]
```

For the current LimberNutz0 trust anchor, use `INDEPENDENT_SSHSIG_B64`. The repository contains `docs/release-governance/reviewers/LimberNutz0-public.ssh`; it does not require or imply a LimberNutz0 PEM private/public-key pair. Do not put a private key in this repository or give it to the founder.

The Release Governance Guard constructs this canonical message exactly:

```text
URAI-INDEPENDENT-RELEASE-APPROVAL-V1
repository=LifeLoggerAI/urai-spatial
pull_request=[FINAL_PR_NUMBER]
exact_sha=[FINAL_40_CHARACTER_SHA]
reviewer=LimberNutz0
decision=APPROVED
reviewed_at=[ISO_8601_TIMESTAMP_WITH_TIMEZONE]
attestation_sha256=[64_HEX_SHA256_OF_SIGNED_ATTESTATION]
attestation_uri=[RETAINED_EVIDENCE_LOCATION]
witness=Adam Clamp
```

After deciding to approve, LimberNutz0 signs the exact bytes of that canonical message with the private key that corresponds to the already-trusted public SSH key. The SSHSIG namespace is `urai-release`.

Example on a reviewer-controlled machine:

```bash
ssh-keygen -Y sign -f <REVIEWER_PRIVATE_KEY_PATH> -n urai-release approval-message.txt
base64 < approval-message.txt.sig
```

Copy the resulting base64 as `INDEPENDENT_SSHSIG_B64`. The guard verifies it against `docs/release-governance/reviewers/LimberNutz0-public.ssh` using identity `LimberNutz0` and namespace `urai-release`.

Do not sign before the exact release SHA and evidence packet are frozen. A later source change makes the approval historical and requires a new decision on the successor.
