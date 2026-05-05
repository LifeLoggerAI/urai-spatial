# Tier-1 Canon Lock Report

## Tier-1 canon surface area found
Primary runtime/governance surfaces:
- `urai-tier1/src/canon/tier1.ts`
- `urai-tier1/src/canon/tier1.schema.ts`
- `docs/canon/TIER_1_CANON_STANDARDS.md`
- `CANON_MIGRATION_PROCESS.md`
- `.github/CODEOWNERS`
- `scripts/check-tier1-canon-lock.mjs`
- `.github/workflows/urai-spatial-ci.yml`

Primary behavioral/contract consumers updated to canonical phase type:
- `urai-tier1/src/spatial/scene/phaseMachine.ts`
- `urai-tier1/src/spatial/hooks/useSceneAuthority.ts`
- `urai-tier1/src/spatial/components/sceneState.ts`
- `urai-tier1/src/spatial/types.ts`

## Source of truth
- Canonical runtime exports are centralized in `urai-tier1/src/canon/tier1.ts`.
- Canonical shape validation is in `urai-tier1/src/canon/tier1.schema.ts`.
- Canon human-readable governance and interpretation is in `docs/canon/TIER_1_CANON_STANDARDS.md`.

## Drift removed
- Replaced duplicated phase unions in core phase/state surfaces with canonical `Tier1Phase` imports.

## Tests added
- `urai-tier1/tests/tier1-canon-lock.test.mjs`
- `urai-tier1/tests/tier1-canon-schema.test.mjs`
- `urai-tier1/tests/tier1-canon-imports.test.mjs`
- `urai-tier1/tests/tier1-canon-naming.test.mjs`

## CI protections added
- CODEOWNERS policy for canon files.
- CI calls `pnpm canon:lock`.
- `check-tier1-canon-lock` requires a `.canon-migration/*.md` marker if canonical files are edited.

## Remaining risks
- Existing unrelated baseline test debt in repository still prevents full test green.
- Additional non-core files still carry legacy literal phase unions; those should be incrementally migrated to canonical imports.
