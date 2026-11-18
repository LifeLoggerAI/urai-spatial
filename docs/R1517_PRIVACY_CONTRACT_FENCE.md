# R1517: Operational Privacy contract fence (review-only)

2026-11-18. Based on Spatial #2125 exact head
`6be4be72215c8dfb3a880cca479276f117b00751`.

## Problem
Spatial's Consent Sanctuary reads owner-private `users/{uid}/privacyPolicy/current`
and invokes `applyConsentPolicy`, granular `createExportRequest` and granular
`createDeletionRequest`. Canonical Privacy #323 at
`98fdf01a19e208a14ac39c36ab56bc9051a8f7c5` uses
`setCanonicalConsent`, `consentRecords`, account-wide export and account-wide
deletion. Silently routing these controls to canonical functions would change
scope and could be destructive. The temporary localhost canonical lab is separate.

## Guard
The old UI and every old callable/collection listener require explicit
`NEXT_PUBLIC_URAI_PRIVACY_CONTRACT=operational-v1`; all other values and an
unset value fail closed. This flag selects an expected contract only. It does
NOT attest server identity, grant permissions, verify signed identity or permit
production private-memory writes. Server authentication, owner checks, consent
policy validation and GCS write fences remain independent requirements.

The default new Vercel R1502 review preview does not set this flag or Firebase
public configuration. Its live private controls must remain unavailable.
Demo UI remains disclosed as simulation only. No deployment was made.

## Evidence / remaining gates
Existing 5/5 Consent Sanctuary tests + new 6/6 contract tests passed
on the isolated existing Runpod CPU Pod, and TypeScript runtime check passed.
Full production-style build results must be attached separately.
This is engineering-level test evidence, not protected CI or external approval.

Next: the Privacy/Spatial owners must design a true canonical purpose-based
consent view and lifecycle UX, with distinct **account-wide** export and delete,
or prove an independently deployed and compatible operational backend. Do not
enable the legacy flag against a canonical-only backend. Do not promote until
signed-owner download, safe deletion, IAM, protected CI and independent review
are certified. HOLD / NO-GO. Private-memory writes DISABLED.
