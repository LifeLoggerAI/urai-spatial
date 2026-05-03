# URAI Spatial Tier Locks

Defines canonical tiers: tier1 (core spatial), tier2 (personal spatial), tier3 (full spatial OS).

## Enforcement
- Client hooks provide visual gating only.
- Server evaluation must use Firebase Function `evaluateSpatialTierLock`.
- Firestore rules prevent client entitlement escalation.

## Collections
- `/users/{uid}`: entitlementTier, consents (server-governed)
- `/features/{flagId}`: feature flags (admin-write)
- `/users/{uid}/tierLockAudit/{auditId}`: denied attempt audit trail

## Manual verification
1. Ensure anonymous loads spatial home.
2. Enable tier2 flags + consents, verify personal features.
3. Disable feature flag, verify fallback to baseline home.
4. Validate audit write on denied server evaluation.
