# LOCS Migration Process

All LOCS/canon changes must include a `.canon-migration/<timestamp>-<slug>.md` marker.

## Proposal authority
- Tier-1 proposals: founder/release-governance only.
- Tier-2 proposals: architecture owners.
- Tier-3 proposals: product owners.
- Tier-4 proposals: engineering owners.
- Tier-5 proposals: release operations.

## Required migration markers
- `CANON_MIGRATION_APPROVED`
- `LOCS_TIER_2_MIGRATION_APPROVED`
- `LOCS_TIER_3_MIGRATION_APPROVED`
- `LOCS_TIER_4_MIGRATION_APPROVED`
- `LOCS_TIER_5_MIGRATION_APPROVED`

## Required checklist
1. Add changelog entry with affected tier and rationale.
2. Include backward-compatibility notes.
3. Include rollback plan and emergency exception path.
4. Run `pnpm test:canon` and all tier tests.
5. Attach required marker(s) in migration documentation.

## Tier immutability rule
Lower-tier migrations must not modify or redefine Tier-1 canon.

## Versioning guidance
- Tier-1/2 change: major or policy-major bump.
- Tier-3/4 change: minor bump unless breaking.
- Tier-5 operational-only change: patch bump.