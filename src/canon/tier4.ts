import type { CanonTier } from './locs'

export type Tier4ImplementationCanonEntry = {
  id: string
  label: string
  owningTier: 'tier4'
  standard: string
  files: string[]
  requiredChecks: string[]
  productionReadinessStatus: 'locked'
}

export const TIER4_IMPLEMENTATION_CANON: Tier4ImplementationCanonEntry[] = [
  { id: 'route-integrity', label: 'Route integrity', owningTier: 'tier4', standard: 'Production routes must be wired, recoverable, and non-debug by default.', files: ['urai-tier1/src/app', 'scripts/check-production-route-exposure.mjs'], requiredChecks: ['pnpm check:production-routes'], productionReadinessStatus: 'locked' },
  { id: 'console-hygiene', label: 'Console hygiene', owningTier: 'tier4', standard: 'Production-critical routes must not emit browser console errors during E2E.', files: ['tests/spatial-lock.mjs'], requiredChecks: ['pnpm lock:e2e'], productionReadinessStatus: 'locked' },
  { id: 'reduced-motion', label: 'Reduced motion', owningTier: 'tier4', standard: 'Spatial animation paths must expose reduced-motion fallbacks.', files: ['urai-tier1/src/app/globals.css', 'urai-tier1/src/scene/HomeScene.tsx'], requiredChecks: ['pnpm urai:tier4'], productionReadinessStatus: 'locked' },
  { id: 'firebase-boundaries', label: 'Firebase boundaries', owningTier: 'tier4', standard: 'Firestore rules and indexes must be explicit and checked before release.', files: ['firebase/firestore.rules', 'firebase/firestore.indexes.json'], requiredChecks: ['pnpm firebase:rules:check'], productionReadinessStatus: 'locked' },
  { id: 'env-readiness', label: 'Environment readiness', owningTier: 'tier4', standard: 'Required environment variables are audited; optional vendor keys degrade safely.', files: ['scripts/preflight.mjs', 'urai-tier1/scripts/tier-lock/env-readiness-audit.mjs'], requiredChecks: ['pnpm preflight', 'pnpm urai:tier4'], productionReadinessStatus: 'locked' },
]

export const tier4: CanonTier = {
  id: 'Tier-4',
  officialLabel: 'Tier-4 Implementation Canon',
  purpose: 'Defines implementation standards for routes, components, backend contracts, environment handling, accessibility, and motion.',
  scope: ['docs/canon/TIER_4_CANON_STANDARDS.md', 'src/canon/tier4.ts', 'scripts', 'firebase', 'urai-tier1/src'],
  governanceLevel: 'Implementation owner + release governance',
  lockLevel: 'Strict',
  allowedMutationLevel: 'Implementation migration with passing release gates',
  dependencies: ['Tier-1', 'Tier-2', 'Tier-3'],
  forbiddenActions: ['Contradict higher tier canon', 'Suppress build or type failures', 'Expose internal routes without gates'],
  protectedPhrases: ['Tier-4', 'Implementation Canon', 'URAI Spatial Canon'],
  protectedFiles: ['docs/canon/TIER_4_CANON_STANDARDS.md', 'src/canon/tier4.ts'],
  requiredReviewLevel: 'Senior implementation reviewer approval',
  requiredChecks: ['pnpm tier4:check', 'pnpm urai:tier4', 'pnpm --filter urai-tier1 build'],
  migrationRequirements: ['Document implementation contract', 'Rerun prior tiers', 'Capture build evidence'],
  overrideRules: ['Implementation may operationalize but never redefine higher-tier canon'],
  examplesFromRepo: TIER4_IMPLEMENTATION_CANON.flatMap((entry) => entry.files),
}
