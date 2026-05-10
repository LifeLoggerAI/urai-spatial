# URAI Privacy Adoption Report

Repository: LifeLoggerAI/urai-spatial
Status: draft scaffold
Privacy version: 0.1.0-draft

## Required files

- [x] `privacy/PRIVACY_VERSION.md` exists.
- [x] `privacy/data-inventory.md` exists.
- [ ] Structured `privacy/data-inventory.yaml` exists.
- [ ] `privacy/feature-manifests/` exists with one manifest per data-processing feature.

## Data mapping

- [ ] Every collected field has a data class.
- [ ] Every derived field has a data class.
- [ ] Every inferred field has a data class.
- [ ] Every shared field has a data class.
- [ ] Every vendor/processor is listed.

## Consent mapping

- [ ] Every collection purpose has a consent tier.
- [ ] Sensitive inference has explicit consent where required.
- [ ] Biometric or identity-linked processing has explicit consent where required.
- [ ] Data-sharing or monetization has explicit opt-in where required.
- [ ] Revocation behavior is implemented.

## User rights

- [ ] Export behavior is mapped.
- [ ] Deletion behavior is mapped.
- [ ] Biometric-only deletion is mapped where relevant.
- [ ] Correction behavior is mapped where relevant.
- [ ] Explanation behavior is mapped for sensitive insights.
- [ ] Opt-out behavior is mapped for optional sharing or monetization.

## Operations

- [ ] Admin access is least-privilege.
- [ ] Support access is least-privilege.
- [ ] Privacy-sensitive actions emit audit events.
- [ ] Incident response owner is assigned.
- [ ] Backup deletion or expiry behavior is documented.

## Launch decision

Status: blocked until completed and reviewed.
