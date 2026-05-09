import type { CanonTier } from './locs'

export type Tier5OperationalCanonEntry = {
  id: string
  label: string
  owningTier: 'tier5'
  operationalRule: string
  evidenceFiles: string[]
  requiredChecks: string[]
  productionReadinessStatus: 'locked'
}

export const TIER5_OPERATIONAL_CANON: Tier5OperationalCanonEntry[] = [
  { id: 'launch-lock-ci', label: 'Launch lock CI', owningTier: 'tier5', operationalRule: 'CI must install, check source integrity, validate tiers 1-5, run build, install Playwright, execute E2E, and upload artifacts.', evidenceFiles: ['.github/workflows/urai-launch.yml', '.github/workflows/urai-spatial-ci.yml'], requiredChecks: ['pnpm verify:release'], productionReadinessStatus: 'locked' },
  { id: 'playwright-e2e-lock', label: 'Playwright E2E lock', owningTier: 'tier5', operationalRule: 'Full release lock requires Playwright route, console, mobile, reduced-motion, guard, and recovery coverage.', evidenceFiles: ['tests/spatial-lock.mjs', 'tests/spatial-tier-lock-hardening.mjs'], requiredChecks: ['pnpm lock:e2e'], productionReadinessStatus: 'locked' },
  { id: 'release-reporting', label: 'Release reporting', owningTier: 'tier5', operationalRule: 'Final lock reports must distinguish pass, fail, not-run, skipped, and blocked states.', evidenceFiles: ['audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md'], requiredChecks: ['pnpm tier5:check'], productionReadinessStatus: 'locked' },
  { id: 'rollback-incident-response', label: 'Rollback and incident response', owningTier: 'tier5', operationalRule: 'Release artifacts must record rollback and incident owner expectations.', evidenceFiles: ['RUNBOOK.md', 'verification/launch-lock.json'], requiredChecks: ['pnpm preflight'], productionReadinessStatus: 'locked' },
  { id: 'artifact-retention', label: 'Artifact retention', owningTier: 'tier5', operationalRule: 'CI must upload spatial lock artifacts for release evidence.', evidenceFiles: ['.github/workflows/urai-launch.yml'], requiredChecks: ['pnpm urai:tier5'], productionReadinessStatus: 'locked' },
]

export const tier5: CanonTier = {
  id: 'Tier-5',
  officialLabel: 'Tier-5 Operational Canon',
  purpose: 'Defines QA, CI/CD, E2E, artifact, rollback, incident, and release evidence gates for URAI Spatial.',
  scope: ['docs/canon/TIER_5_CANON_STANDARDS.md', 'src/canon/tier5.ts', '.github/workflows', 'audit/tier-lock'],
  governanceLevel: 'Release manager + production governance',
  lockLevel: 'Strict',
  allowedMutationLevel: 'Operational migration with complete evidence',
  dependencies: ['Tier-1', 'Tier-2', 'Tier-3', 'Tier-4'],
  forbiddenActions: ['Claim release readiness without E2E', 'Claim CI protection without workflow gates', 'Hide command failures'],
  protectedPhrases: ['Tier-5', 'Operational Canon', 'URAI Spatial Release Lock'],
  protectedFiles: ['docs/canon/TIER_5_CANON_STANDARDS.md', 'src/canon/tier5.ts', 'audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md'],
  requiredReviewLevel: 'Release governance approval',
  requiredChecks: ['pnpm tier5:check', 'pnpm urai:tier5', 'pnpm verify:release', 'pnpm lock:e2e'],
  migrationRequirements: ['Capture command evidence', 'Upload artifacts', 'Record blocker state truthfully'],
  overrideRules: ['Operational canon can gate but cannot redefine tiers 1-4'],
  examplesFromRepo: TIER5_OPERATIONAL_CANON.flatMap((entry) => entry.evidenceFiles),
}
