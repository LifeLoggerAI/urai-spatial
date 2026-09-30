# Independent offline reviewer keys

UrAi permits independent human release review without granting the reviewer permanent write access to the private GitHub repository.

A trusted offline reviewer retains their own private signing key. Only the corresponding public key belongs in this repository. The founder must not generate, possess, request, or retain the reviewer's private key.

## Current LimberNutz0 trust anchor

For the current release mechanism, the trusted key is:

`docs/release-governance/reviewers/LimberNutz0-public.ssh`

It is an OpenSSH Ed25519 public key used by the Release Governance Guard's SSHSIG verification path.

The current repository does **not** contain `docs/release-governance/reviewers/LimberNutz0-public.pem`. Therefore, for LimberNutz0, the valid no-source-change offline approval mechanism is the SSHSIG path unless a future separately governed commit deliberately establishes another trust anchor before freeze.

Do not replace the committed public key merely to complete a review. If the reviewer no longer controls the corresponding private key, stop and treat that as a governance dependency requiring a separately reviewed trust-anchor change before any new freeze.

## Review and signing sequence

1. Freeze the exact candidate SHA and the evidence packet.
2. LimberNutz0 independently inspects that exact candidate and evidence.
3. LimberNutz0 records an APPROVED or NOT APPROVED decision without coaching or pre-signing.
4. Only after an APPROVED decision, compute the finalized attestation SHA-256 and canonical approval message.
5. LimberNutz0 signs the exact canonical message on a machine they control with the private key corresponding to `LimberNutz0-public.ssh`.
6. Use OpenSSH SSHSIG namespace `urai-release`.
7. Record the resulting base64 signature as `INDEPENDENT_SSHSIG_B64` with the other exact-head metadata required by the guard.
8. Re-run the Release Governance Guard and retain its receipt.

Example reviewer-side signing command:

```bash
ssh-keygen -Y sign -f <REVIEWER_PRIVATE_KEY_PATH> -n urai-release approval-message.txt
base64 < approval-message.txt.sig
```

The private key never enters the repository or the founder's custody.

A GitHub-native APPROVED review may satisfy the guard only when the exact current repository rules and collaborator permissions make that reviewer eligible. Read-only access alone is not sufficient for the current native-review branch of the guard.

A later source change invalidates the reviewed SHA and requires a fresh decision and, if approved, a fresh signature for the successor.
