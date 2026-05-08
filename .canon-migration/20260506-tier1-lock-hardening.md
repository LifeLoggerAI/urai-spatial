# Tier-1 Lock Hardening Migration Marker

Marker: TIER_1_CANON_MIGRATION_APPROVED
Legacy marker compatibility: CANON_MIGRATION_APPROVED

Founder: Adam Clamp
Review level: founder-or-canon-council
Scope: Tier-1 source-of-truth exports, home invariant enforcement, Firestore boundary checks, package scripts, and CI lock wiring.
Reason: Normalize the existing Tier-1 canon surface into typed source-of-truth exports and enforce the no-text/no-button home invariant plus Firebase boundary checks without creating a parallel canon system.

Changed protected files:
- src/canon/tier1.ts
- src/canon/foundation.ts
- src/canon/identity.ts
- src/canon/ontology.ts
- src/canon/privacy.ts
- src/canon/design.ts
- src/canon/invariants.ts
- src/canon/index.ts
- src/app/page.tsx
- urai-tier1/src/app/page.tsx
- scripts/check-home-invariant.mjs
- scripts/check-firestore-tier1-boundaries.mjs
- scripts/check-tier1-drift.mjs
- package.json
- .github/workflows/urai-spatial-ci.yml

Backward compatibility:
- Existing `tier1` CanonTier export remains available.
- Existing canon check scripts remain in place.
- New modules are additive and exported from `src/canon/index.ts`.

Security impact review:
- Adds explicit automated Firestore rule smoke checks for entitlement/admin/founder/canon override, feature flag, audit log, and unsafe allow-all boundaries.
- Does not relax any Firestore rule.

Privacy/consent impact review:
- Adds explicit Tier-1 privacy and consent canon exports.
- Does not add raw data persistence.

Home/spatial impact review:
- Removes visible HUD from root Tier-1 home render path.
- Removes visible loading fallback text from app-level Tier-1 home render path.
- Adds automated invariant checks for visible text, buttons, onboarding, narration, navigation, login, and upgrade copy.

Test updates required:
- pnpm tier1:check
- pnpm tier1:drift
- pnpm canon:check
- pnpm home:invariant
- pnpm firebase:rules:check
- pnpm test:canon

Rollback plan:
- Revert this branch or the protected-file commits if CI exposes regressions.
- Preserve the prior `tier1` export compatibility during rollback.
