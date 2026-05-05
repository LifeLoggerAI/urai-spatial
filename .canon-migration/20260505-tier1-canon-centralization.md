# Canon Migration: 2026-05-05 Tier-1 Canon Centralization

## Reason
Tier-1 standards were fragmented across docs/types and not strongly migration-gated.

## Canon surfaces changed
- `urai-tier1/src/canon/tier1.ts`
- `urai-tier1/src/canon/tier1.schema.ts`
- `docs/canon/TIER_1_CANON_STANDARDS.md`
- `CANON_MIGRATION_PROCESS.md`
- CI/governance files that enforce canon lock.

## Compatibility
No route/slug renames. Core phase semantics unchanged.

## Rollback
Revert commit and remove canon-lock CI step if emergency unblock is required.
