import type { CanonTier } from './locs'

export type Tier3FeatureCanonEntry = {
  id: string
  label: string
  owningSystem: string
  owningTier: 'tier3'
  route: string
  component: string
  dataRequirements: string[]
  interactionStates: string[]
  accessibilityRequirements: string[]
  testRequirements: string[]
  productionReadinessStatus: 'locked'
}

export const TIER3_FEATURE_CANON: Tier3FeatureCanonEntry[] = [
  {
    id: 'spatial-home-flow',
    label: 'Spatial home entry',
    owningSystem: 'spatial',
    owningTier: 'tier3',
    route: '/',
    component: 'FinalHomeThreshold + HomeSpatialRuntimeLayer',
    dataRequirements: ['No production mock user data; launch copy is static canon content only'],
    interactionStates: ['first-load', 'home-to-life-map', 'keyboard-enter', 'reduced-motion', 'webgl-fallback'],
    accessibilityRequirements: ['labeled primary navigation', 'keyboard path', 'screen-reader-safe scene label', 'capability-aware fallback'],
    testRequirements: ['home invariant', 'spatial E2E', 'route-owner exclusivity', 'no console error audit'],
    productionReadinessStatus: 'locked',
  },
  {
    id: 'life-map-navigation',
    label: 'Life Map constellation navigation',
    owningSystem: 'memory',
    owningTier: 'tier3',
    route: '/life-map',
    component: 'SpatialLifeMapCanonical',
    dataRequirements: ['User-owned memories or explicit launch-demo owner boundary'],
    interactionStates: ['route-transition', 'desktop-pointer', 'mobile-touch', 'empty-state', 'reduced-motion'],
    accessibilityRequirements: ['focusable navigation controls', 'ARIA scene status', 'escape recovery', 'semantic no-WebGL access'],
    testRequirements: ['Life Map unit tests', 'spatial hardening E2E', 'route-owner exclusivity'],
    productionReadinessStatus: 'locked',
  },
  {
    id: 'focus-memory-inspection',
    label: 'Focus memory inspection',
    owningSystem: 'cognitive-mirror',
    owningTier: 'tier3',
    route: '/focus',
    component: 'FocusChamberClient',
    dataRequirements: ['Selected memory signal with consent-safe fallback state'],
    interactionStates: ['life-map-to-focus', 'focus-to-replay', 'escape-back'],
    accessibilityRequirements: ['visible back path', 'keyboard fallback', 'reduced-motion camera state'],
    testRequirements: ['focus route smoke', 'selected-memory contract', 'spatial lock E2E'],
    productionReadinessStatus: 'locked',
  },
  {
    id: 'timeline-replay-flow',
    label: 'Timeline replay flow',
    owningSystem: 'storytime',
    owningTier: 'tier3',
    route: '/replay',
    component: 'CinematicReplayClient',
    dataRequirements: ['Replay event contract and launch-demo isolation'],
    interactionStates: ['focus-to-replay', 'replay-return', 'success-complete'],
    accessibilityRequirements: ['playback labels', 'keyboard continue path', 'no forced motion'],
    testRequirements: ['replay Tier-5 lock', 'replay product controls', 'spatial lock E2E'],
    productionReadinessStatus: 'locked',
  },
  {
    id: 'unwind-safe-recovery',
    label: 'Unwind safe recovery',
    owningSystem: 'emotional-os',
    owningTier: 'tier3',
    route: '/unwind',
    component: 'UnwindCompatibilityPage -> SpatialLifeMapCanonical',
    dataRequirements: ['No telemetry write without consent boundary'],
    interactionStates: ['replay-return', 'back-to-safe-state', 'escape-recovery'],
    accessibilityRequirements: ['clear recovery action', 'keyboard route back', 'screen-reader calm state'],
    testRequirements: ['route canon', 'route exposure check', 'spatial E2E unwind/back coverage'],
    productionReadinessStatus: 'locked',
  },
]

export const tier3: CanonTier = {
  id: 'Tier-3',
  officialLabel: 'Tier-3 Feature Canon',
  purpose: 'Defines production feature flows that depend on Tier-1 foundation and Tier-2 systems without redefining either.',
  scope: ['docs/canon/TIER_3_CANON_STANDARDS.md', 'src/canon/tier3.ts', 'urai-tier1/src/app'],
  governanceLevel: 'Feature lock review required',
  lockLevel: 'Strict',
  allowedMutationLevel: 'Feature migration with preserved Tier-1/Tier-2 dependencies',
  dependencies: ['Tier-1', 'Tier-2'],
  forbiddenActions: ['Contradict higher tier canon', 'Bypass privacy or consent systems', 'Ship orphan route stubs'],
  protectedPhrases: ['Tier-3', 'Feature Canon', 'URAI Spatial Canon'],
  protectedFiles: ['docs/canon/TIER_3_CANON_STANDARDS.md', 'src/canon/tier3.ts'],
  requiredReviewLevel: 'Feature and canon reviewer approval',
  requiredChecks: ['pnpm tier3:check', 'pnpm urai:tier3', 'pnpm lock:e2e'],
  migrationRequirements: ['Document route ownership', 'Preserve spatial recovery path', 'Rerun prior tiers'],
  overrideRules: ['Tier-1 and Tier-2 cannot be redefined by feature canon'],
  examplesFromRepo: TIER3_FEATURE_CANON.map((feature) => feature.component),
}
