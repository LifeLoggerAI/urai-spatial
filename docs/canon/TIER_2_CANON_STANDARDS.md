# Tier-2 Canon Standards

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
Use `.canon-migration/*.md` and include required markers, rationale, rollback plan, and compatibility notes.

## Enforcement expectations
- `pnpm tier2:check`
- `pnpm test:canon`

## Required checks
- `node scripts/check-tier2-governance.mjs`
- `pnpm test:canon`

## Relationship to Tier-1
Tier-2 extends Tier-1 and may not redefine, weaken, or bypass Tier-1 canon.


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
