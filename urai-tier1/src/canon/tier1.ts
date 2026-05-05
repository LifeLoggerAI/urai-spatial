/**
 * TIER-1 CANON LOCKED — DO NOT MODIFY WITHOUT CANON MIGRATION.
 */
export const TIER1_CANON_VERSION = '1.0.0' as const
export const TIER1_HOME_INVARIANT = { noText: true, noButtons: true, noNavigation: true, noOnboarding: true, noNarration: true, skyPrimary: true, spatialOnly: true } as const
export const TIER1_PHASE_CHAIN = ['HOME', 'ASCENT', 'LIFEMAP', 'FOCUS', 'REPLAY'] as const
export const TIER1_ESC_UNWIND_CHAIN = ['REPLAY', 'FOCUS', 'LIFEMAP', 'HOME'] as const
export const TIER1_ROUTES = { home: '/', lifeMap: '/life-map', focus: '/focus', replay: '/replay' } as const
export const TIER1_COLLECTIONS = { launchEvents: 'launch_events', lifeMapNodes: 'life_map_nodes', lifeMapEdges: 'life_map_edges' } as const
export const TIER1_TERMS = { tierName: 'Tier-1', spatialLoop: 'Home → Ascent → LifeMap → Focus → Replay' } as const
export type Tier1Phase = (typeof TIER1_PHASE_CHAIN)[number]
