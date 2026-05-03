# Spatial Lock QA Checklist

- [ ] Home invariant holds: no text/buttons/navigation in home scene.
- [ ] Tier1 anonymous renders sky baseline.
- [ ] Tier2 requires auth + consent + flags.
- [ ] Tier3 requires auth + entitlement + flags + safety.
- [ ] Denied requests emit `spatial_lock_denied` and fallback.
- [ ] Firestore rules block client writes to entitlement/admin fields.
- [ ] Function writes tier lock audit events for denied tier2/3 checks.
