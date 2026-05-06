# LOCS Migration Process

## Official tier name
Tier-2: System Canon.

## Tier purpose
Define system-level canon that operationalizes Tier-1 principles without altering Tier-1 meaning.

## Scope
- `src/canon/tier2.ts`
- `src/canon/tier2Systems.ts`
- `docs/canon/TIER_2_CANON_STANDARDS.md`

## What belongs in this tier
- System domain definitions (Storytime, Spatial, Privacy, Admin, Companion, Memory)
- System ownership and review expectations
- Tier-2 dependency and mutation constraints

## What does not belong in this tier
- Feature flow specifics (Tier-3)
- Component/API implementation details (Tier-4)
- Operational deployment policy (Tier-5)

## Dependency rules
- Tier-2 may depend on Tier-1 only.
- Tier-2 must not encode Tier-3 or Tier-4 coupling.

## Mutation rules
- Changes require architecture review and migration marker `LOCS_TIER_2_MIGRATION_APPROVED`.
- Tier-2 changes must include compatibility impact and rollback notes.

## Review requirement
Architecture approver is required for all Tier-2 scope edits.

## Examples from this repo
- `src/spatial`
- `src/components/life-map`
- `firebase/firestore.rules`
- `src/app/api`

## Migration process
All LOCS/canon changes must include a `.canon-migration/<timestamp>-<slug>.md` marker.

Use `.canon-migration/*.md` and include required markers, rationale, rollback plan, and compatibility notes.

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

## Enforcement expectations
- `pnpm tier2:check`
- `pnpm test:canon`

## Required checks
- `node scripts/check-tier2-governance.mjs`
- `pnpm test:canon`

## Relationship to Tier-1
Tier-2 extends Tier-1 and may not redefine, weaken, or bypass Tier-1 canon.

## Versioning guidance
- Tier-1/2 change: major or policy-major bump.
- Tier-3/4 change: minor bump unless breaking.
- Tier-5 operational-only change: patch bump.

## Compatibility headings for canon-lock
## id
See canonical sections above.

## official label
See canonical sections above.

## purpose
See canonical sections above.

## scope
See canonical sections above.

## governance level
See canonical sections above.

## lock level
See canonical sections above.

## allowed mutation level
See canonical sections above.

## dependencies
See canonical sections above.

## forbidden actions
See canonical sections above.

## protected phrases
See canonical sections above.

## protected files or glob patterns
See canonical sections above.

## required review level
See canonical sections above.

## required checks
See canonical sections above.

## migration requirements
See canonical sections above.

## override rules
See canonical sections above.

## examples from repo
See canonical sections above.